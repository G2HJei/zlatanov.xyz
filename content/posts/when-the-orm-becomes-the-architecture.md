---
title: When the ORM Becomes the Architecture
description: ORMs make the first table cheap and the hundredth expensive. A case study of a versioned datastore built on plain SQL, the time it fell into the ORM trap without an ORM, and the design that got it out.
date: 2026-10-04
tags: [ case study ]
draft: true
---

Where in your code does the database get called? In most Spring codebases I'm asked to look at,
the honest answer is: anywhere. A getter on an entity, a loop in a service, the JSON serializer
writing a response, the end of a transaction that nobody remembers opening. Nobody decided that.
It's the default.

Ted Neward put the problem bluntly in 2006, in an
[essay](https://blogs.newardassociates.com/blog/2006/the-vietnam-of-computer-science.html) whose
title became a meme:

> Object/Relational Mapping is the Vietnam of Computer Science. It represents a quagmire which starts well, gets more complicated as time passes, and before long entraps its users in a commitment that has no clear demarcation point, no clear win conditions, and no clear exit strategy.

Martin Fowler answered with a fairer view in [OrmHate](https://martinfowler.com/bliki/OrmHate.html):
"The object/relational mapping problem is *hard*." The tools aren't the villain: "They aren't
pretty tools, but then the problem they tackle isn't exactly cuddly either."

Both are right, and this post lives in the gap between them. An ORM is a good tool that turns into
a bad architecture under particular conditions, and the turn is easy to miss because it happens one
reasonable decision at a time. Below: what ORMs cost and where those costs hide, then a case study
of a datastore that went without one. It still fell into the same trap once, and it got out by
writing down, in plain code, what an ORM does behind your back.

The case comes from a client engagement, so the domain and everything that could identify it are
replaced with generic stand-ins: orders, customers and addresses. The structure, the decisions and
the shape of the code are real.

## What an ORM promises

Fowler describes the job like this: "Essentially what you are doing is synchronizing between two
quite different representations of data, one in the relational database, and the other in-memory."
An ORM such as Hibernate does the synchronising for you. You work with objects, and it decides when
to load them, when to write them and in which order. Lazy loading fetches an association the first
time you touch it. Dirty checking notices which fields you changed and writes them at commit.
Cascades carry a save from a parent to its children.

For a forms-over-tables application that's a great deal. An entity, a repository interface and no
SQL get you from an empty project to working screens in an afternoon. If that's your system, use
it with a clear conscience; it's the same territory where a plain
[layered architecture](/blog/architecture-styles-and-when-not-to-use-them/#layered) works.

## Where the costs hide

Each of those conveniences is a decision moved out of your code and into the framework's runtime.
Each one is small, and each one is invisible in the line that triggers it:

```java
@Entity
public class Order {
  @Id @GeneratedValue private Long id;
  @ManyToOne(fetch = LAZY) private Customer customer;
  @OneToMany(mappedBy = "order", cascade = ALL) private List<OrderLine> lines = new ArrayList<>();
  private OrderStatus status;

  protected Order() {} // the ORM needs it, the domain doesn't

  public Money total() {
    return lines.stream().map(OrderLine::amount).reduce(Money.ZERO, Money::plus); // a query, maybe
  }
}

@Transactional
public void approve(Long orderId) {
  var order = orders.findById(orderId).orElseThrow();
  order.approve();                          // no save: dirty checking writes it at commit
  order.getCustomer().setCreditLimit(ZERO); // another aggregate, written just the same
}
```

What that code doesn't show:

- **Invisible reads.** `total()` looks like arithmetic. The first call loads the lines, so calling
  it in a loop over orders runs one query per order: the N+1 problem. It never shows up in a unit
  test with three rows; it shows up in production with thirty thousand. Code review can't see it
  either, because the query isn't in the diff.
- **Invisible writes.** `approve` never calls `save`. Every managed entity that changed is flushed
  when the transaction commits, whoever changed it and why. "Which tables does this use case
  write?" has no answer in the code; you find out from the SQL log.
- **Transactions grow to fit the object graph.** Lazy loading only works while the persistence
  context is open, so the transaction has to stay open as long as anybody might navigate the graph.
  `@Transactional` moves from the repository to the service, the service calls three others inside
  it, and then a controller renders a lazy collection and throws `LazyInitializationException`. The
  usual cure is open session in view, which Spring Boot switches on by default (and warns about at
  startup): the persistence context stays open until the response is written, and now the web
  layer issues queries too.
- **The graph ignores aggregate boundaries.** Vaughn Vernon's rule in
  [Effective Aggregate Design](https://www.dddcommunity.org/library/vernon_2011/) is to reference
  other aggregates by identity. Navigation, an ORM's best feature, is the opposite:
  `order.getCustomer()` hands you a live, managed customer, and dirty checking saves whatever you
  do to it. The last line of `approve` changes two aggregates in one transaction, and nothing
  objects.
- **The domain model bends to the mapper.** JPA wants a no-argument constructor, non-final classes
  and non-final fields so it can proxy and populate them. `equals` and `hashCode` have to survive
  proxies and IDs that only exist after the insert, and bidirectional associations have to be kept
  in sync by hand. The domain imports `jakarta.persistence`, the sign that a
  [hexagonal architecture](/blog/architecture-styles-and-when-not-to-use-them/#hexagonal-ports-and-adapters)
  exists only in the folder names.
- **The database shrinks to what the mapper understands.** PostgreSQL has `DISTINCT ON`,
  `INSERT … ON CONFLICT`, arrays, `jsonb`, enum types and window functions. The mapper speaks a
  common subset, the rest goes through native queries and custom types, and the codebase ends up
  with two persistence styles. Even batching has small print: Hibernate quietly turns off JDBC
  insert batching for entities whose IDs come from an identity column.
- **Tests need the database.** If loading and saving happen implicitly, the only way to find out
  what a use case does to the database is to run it against one. Teams reach for an in-memory H2
  that pretends to be PostgreSQL, or a Spring context per test class, and the
  [five-minute commit stage](/blog/fast-development-cycles-made-simple/) quietly becomes twenty.

## The trap

None of these is a reason to avoid an ORM on its own. The trap is what they add up to as the domain
grows.

On day one the ORM is a library inside a persistence adapter. By day five hundred it's a property
of every layer:

<figure class="diagram" data-title="the orm trap">
<svg viewBox="0 0 360 216" role="img" aria-label="Four stacked layers: web, application, domain and persistence. Each is wired to one persistence context that spans all of them: the web layer through open session in view, the application layer through transactions that flush at commit, the domain through entity annotations and lazy proxies, and the persistence layer through JPA repositories.">
<rect class="box" x="8" y="8" width="262" height="44" rx="4"/>
<rect class="box" x="8" y="60" width="262" height="44" rx="4"/>
<rect class="box on" x="8" y="112" width="262" height="44" rx="4"/>
<rect class="box" x="8" y="164" width="262" height="44" rx="4"/>
<text class="start" x="20" y="23">web</text>
<text class="start" x="20" y="75">application</text>
<text class="start on" x="20" y="127">domain</text>
<text class="start" x="20" y="179">persistence</text>
<text class="note start" x="20" y="40">open session in view</text>
<text class="note start" x="20" y="92">@Transactional, flush at commit</text>
<text class="note start" x="20" y="144">@Entity, lazy proxies, cascades</text>
<text class="note start" x="20" y="196">JPA repositories</text>
<rect class="box tint on" x="290" y="8" width="62" height="200" rx="4"/>
<text class="on" x="321" y="108" transform="rotate(-90 321 108)">persistence context</text>
<path class="wire on dash" d="M270 30H290M270 82H290M270 134H290M270 186H290"/>
</svg>
<figcaption>Once the entities are the domain model, the persistence context isn't in an adapter any more. Every layer depends on it being open.</figcaption>
</figure>

The web layer depends on the session staying open. The application layer draws its transaction
boundaries around fetch plans instead of business operations. The domain classes are shaped by
what the mapper can proxy. The tests need a database to say anything at all. Nobody chose that
architecture; it was the default at every step, and every step was reasonable.

That's what makes it an anti-pattern rather than a bad tool: persistence stops being a concern that
lives in one place. Neward's "no clear exit strategy" follows directly. You can't swap the ORM out
of an adapter when the domain model *is* the mapping.

The textbook fix is to keep the JPA entities inside the adapter and map them to a separate domain
model. It works, but count the cost: two classes per concept, a mapper between them, and you've
given up the main thing the ORM sold you, which was not writing mapping code. None of its automatic
behaviour reaches the domain any more, which was the point. What's left in the adapter is a query
generator and a write scheduler with a large runtime attached.

## The case: a datastore that has to remember everything

The system is the central datastore of a data platform. Several ingestion services each read one
external source, translate its feed into commands and publish them on Kafka. The datastore is the
only service that writes the shared, normalised model; analytics jobs and a back-office
application read it through a GraphQL API. Java 21, Spring Boot, PostgreSQL, Liquibase.

Three requirements make its persistence hard:

- **Nothing is overwritten.** The platform has to answer questions about the past: what did this
  order look like on 1 March, *as we knew it* on 15 March? That is a bitemporal model, with valid
  time (when a fact was true in the world) and transaction time (when the system learnt it).
  Sources send corrections late and out of order, so both clocks matter.
- **Documents arrive whole, and in bulk.** One incoming order carries its lines, its customer, the
  customer's addresses and the identifiers each source system uses for all of them. It breaks into
  about twenty kinds of rows.
- **Several tenants share the store.** Every row belongs to one of them, and no query may cross
  that line.

Two years in, the model has about 85 logical tables, close to 60 of them versioned, behind some 90
repository ports, and the schema has been through more than 200 migrations.

This isn't a migration story. The team chose plain Spring JDBC in the project's first weeks, and
the datastore has never contained a `jakarta.persistence` import.

## Rows are not objects

The first thing an ORM would have fought is the storage model. Every versioned entity is two
tables: an identity table with the keys that never change, and an append-only `_data` table with
one row per version.

```sql
CREATE TABLE orders (
  id          UUID PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customer (id),
  start_date  DATE,
  end_date    DATE NOT NULL DEFAULT '9999-01-01'
);

CREATE TABLE orders_data (
  id          BIGSERIAL PRIMARY KEY,
  logical_id  UUID NOT NULL REFERENCES orders (id),
  effect_date DATE NOT NULL,                       -- valid time
  create_ts   TIMESTAMPTZ NOT NULL DEFAULT now(),  -- transaction time
  status      order_status,
  total       NUMERIC(12, 2),
  metadata    JSONB
);
```

Syncing an order never updates a version; it appends one. Deleting sets `end_date` on the identity
row. Reading "the order" means picking the latest version that was valid on the requested date and
known at the requested moment, which PostgreSQL does in one statement:

```sql
SELECT DISTINCT ON (logical_id) entity_data.*, entity.*
  FROM orders_data entity_data
  JOIN orders entity ON entity_data.logical_id = entity.id
 WHERE customer_id = :customerId
   AND effect_date <= :effect_date
   AND entity_data.create_ts <= :create_ts
   AND tenant_id = :tenant_id
 ORDER BY logical_id DESC, effect_date DESC, entity_data.create_ts DESC;
```

An ORM maps one class to one row and assumes the row is the current state. Here an object is a
join of two rows chosen by two clocks, and every query needs three parameters that business code
should never have to pass. You can bend Hibernate into this with filters, custom loaders and native
queries. By then you're writing the SQL anyway, through a layer that makes it harder to read.

## SQL as a small, tested library

So the team wrote the SQL, but not three hundred times. A small builder generates the standard
shapes: the as-of read above, a cheap read of the identity table alone, and the inserts. The
temporal and tenant parameters come from a context that is set once per incoming command or HTTP
request, and the builder adds them to every query it writes. A reflection-based row mapper fills
the domain classes straight from the result set, column `customer_id` into field `customerId`.
More than 80 of the 90 repository adapters use that one mapper, and the whole datastore has about
ten hand-written SQL statements, for the queries that don't fit a standard shape.

The domain classes are flat and refer to each other by ID only:

```java
@Data
@Accessors(fluent = true)
public class Order extends TimeManagedEntity implements OrderIdentity {
  private UUID id;                          // orders: never changes
  private UUID customerId;                  // another entity, by id
  @TimeManaged private OrderStatus status;  // orders_data: one value per version
  @TimeManaged private BigDecimal total;
  @TimeManaged private JsonNode metadata;   // jsonb
}
```

`@TimeManaged` is the project's own annotation and the only persistence hint in the domain: it
tells the builder which of the two tables a field lives in. There's no object to navigate, so
there's nothing to load lazily, and an order can't reach into its customer. Vernon's rule is the
only option the model offers.

To be fair, these are data classes, not rich aggregates. The rules live in the command steps
described below. That fits a datastore whose job is mostly to normalise and to remember; a domain
with deep invariants would want behaviour on the objects, and nothing in this approach prevents
it.

Writes are idempotent upserts generated from the same classes: `INSERT … ON CONFLICT (id) DO
UPDATE` on the identity table and a plain append on the version table. IDs are UUIDv7, generated by
the application, so a whole graph of new rows can be wired together before any of it touches the
database.

## The trap, without an ORM

Plain SQL didn't make the datastore immune. In the first version of the write side, each incoming
order walked down a tree of `sync` methods. Each step looked up its own row, saved it, and handed
the new ID to the next step:

```java
public UUID sync(OrderData data) {
  var existing = data.externalIds().stream()          // one query per external id
      .map(id -> orderRepository.identifyByExternalId(id.value(), id.source()))
      .filter(Objects::nonNull)
      .distinct()
      .toList();
  var customerId = customerSync.sync(data.customer()); // its own queries and saves
  var orderId = orderRepository.save(toOrder(data, existing, customerId)).id();
  orderExternalIdSync.sync(orderId, data.externalIds());
  orderLineSync.sync(orderId, data.lines());           // and so on, down the tree
  return orderId;
}
```

A `@Transactional` on the command processor wrapped the whole walk.

No lazy loading, no dirty checking, no ORM in sight, and it's the same shape. Reads and writes are
interleaved with the business logic, wherever the code happens to need them. The transaction wraps
everything because nobody can say where the writes are. The number of queries grows with the
number of records times the depth of the tree, and every test needs a fake or a mock for each
repository a step might touch.

That's the lesson I took from this project. The ORM doesn't create the trap; it makes it the
default and hides it. The trap is a habit: *load what you need when you happen to need it, save
when you happen to be done.* Any data access library lets you do that.

## Read everything, decide in memory, write once

The rewrite took about six weeks in early 2026 and split every command into stages that never mix:

<figure class="diagram" data-title="write path">
<svg viewBox="0 0 360 318" role="img" aria-label="Commands are buffered into batches of up to 64, or five seconds. Initializers read everything the batch needs from the database with batched queries. Steps then work purely in memory, with no database access. Finally the commit writes all entities in one transaction, in a fixed order, with one batch per entity type.">
<defs><marker id="orm-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker><marker id="orm-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="34" y="8" width="318" height="46" rx="4"/>
<rect class="box" x="34" y="76" width="318" height="46" rx="4"/>
<rect class="box on" x="34" y="144" width="318" height="46" rx="4"/>
<rect class="box" x="34" y="212" width="318" height="46" rx="4"/>
<text class="start" x="46" y="24">command buffer</text>
<text class="start" x="46" y="92">initializers</text>
<text class="start on" x="46" y="160">steps</text>
<text class="start" x="46" y="228">commit</text>
<text class="note start" x="46" y="41">up to 64 commands or 5 s</text>
<text class="note start" x="46" y="109">batched reads into the context</text>
<text class="note start" x="46" y="177">pure functions over the context</text>
<text class="note start" x="46" y="245">fixed order, a batch per type</text>
<rect class="core" x="284" y="21" width="56" height="20" rx="3"/>
<rect class="core" x="284" y="89" width="56" height="20" rx="3"/>
<rect class="core" x="284" y="157" width="56" height="20" rx="3"/>
<rect class="core" x="284" y="225" width="56" height="20" rx="3"/>
<text x="312" y="31">batch</text>
<text x="312" y="99">read</text>
<text x="312" y="167">decide</text>
<text x="312" y="235">write</text>
<path class="wire" d="M312 54V76" marker-end="url(#orm-tip)"/>
<path class="wire" d="M312 122V144" marker-end="url(#orm-tip)"/>
<path class="wire" d="M312 190V212" marker-end="url(#orm-tip)"/>
<path class="wire on" d="M193 258V279" marker-end="url(#orm-tip-on)"/>
<path class="box" d="M149 286v20a44 6 0 0 0 88 0v-20"/>
<ellipse class="box" cx="193" cy="286" rx="44" ry="6"/>
<text x="193" y="299">database</text>
<path class="wire" d="M149 296H20V99H34" marker-end="url(#orm-tip)"/>
<text class="note" x="10" y="198" transform="rotate(-90 10 198)">SELECT … IN (…)</text>
<text class="note start" x="203" y="268">one transaction</text>
</svg>
<figcaption>The database is read at the top and written at the bottom. The steps in between can't reach it, because they hold no repository.</figcaption>
</figure>

1. **Buffer.** Commands are collected per source and type, up to 64 of them or five seconds,
   whichever comes first, and processed as one batch.
2. **Read.** *Initializers* load everything the batch needs into a `CommandContext`, with one
   `IN (…)` query per kind of row instead of one per record.
3. **Decide.** *Steps* run in memory over the context: resolve existing rows by their external
   IDs, create new ones, and bind each entity to the command it came from. There are close to
   seventy steps, and not one of them holds a repository. A step that fails for one command removes
   that command and everything bound to it from the batch, and the rest carry on.
4. **Write.** A commit manager collects every bound entity and hands them to one repository that
   saves them all in a single transaction.

The base class of every command processor says exactly that:

```java
public CommandExecution<I> execute(List<I> commands) {
  var context = CommandContext.of();
  var toProcess = new ArrayList<>(commands);
  initializer().initializeContext(context, toProcess);  // read: batched queries
  var failures = processCommands(context, toProcess);   // decide: in memory, no I/O
  var results = commitManager.commitContext(context, toProcess, resultClass()); // write: one transaction
  return new CommandExecution<I>().results(results).failures(failures);
}
```

A step reads like the job it does, with no I/O to wade through:

```java
protected void bindEntities(CommandContext context, SyncOrderCommand command) {
  var data = command.orderData();
  var order = new Order()
      .id(context.boundTo(command).findId(OrderExternalId.class, OrderExternalId::orderId))
      .customerId(findCustomerId(context, data.customer()))
      .status(data.status())
      .effectDate(data.effectDate());
  context.bind(command, order);
}
```

And the write is one method with a fixed order:

```java
private final List<Class<?>> saveOrder = List.of(
    Address.class, Customer.class, CustomerExternalId.class,
    Order.class, OrderExternalId.class, OrderLine.class /* ... */);

@Transactional
public void save(Collection<LogicalIdentity> entities) {
  var present = entities.stream().map(Object::getClass).collect(toSet());
  saveOrder.stream()
      .filter(present::contains)
      .forEach(type -> saveAll(type, entities)); // one JDBC batch per type
}
```

Parents go before children, so the foreign keys hold. Each entity type is one JDBC batch, so the
round trips to the database grow with the number of *kinds* of rows in a batch, not the number of
rows. If the batch fails as a whole, the commands are retried one at a time, each in its own
transaction, and every source gets its own result or error back.

After the rewrite the team removed Spring's transaction support from the processing module
altogether. The only `@Transactional` left on the write path is on that one method.

Now look at what the design is, in the catalogue of Fowler's *Patterns of Enterprise Application
Architecture*. The context is an [Identity Map](https://martinfowler.com/eaaCatalog/identityMap.html),
which "ensures that each object gets loaded only once by keeping every loaded object in a map":
two commands in one batch that mention the same new order end up with the same ID. The commit is a
[Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html), which "maintains a list of
objects affected by a business transaction and coordinates the writing out of changes and the
resolution of concurrency problems." The team had rebuilt two of the patterns an ORM is made of.

The difference isn't in the patterns. It's that they're explicit, scoped to one batch, and readable
in two classes. There's no lazy loading, so every read is in an initializer. There's no dirty
checking, so every write is an entity that some step bound to the context on purpose. You can point
at the line where the database is read and the line where it's written, and nothing in between can
touch it. (The second half of Fowler's sentence, the concurrency problems, comes back below.)

## What it bought

- **Fast tests without a database.** A step is a function over a context: build the context, run
  the step, assert on what got bound. The datastore's 830 unit tests add up to under six seconds,
  and most step tests mock nothing at all; the rest mock only the ID generator.

  ```java
  @BeforeEach
  void setUp() {
    context.add(customerExternalId);
    context.bind(command, orderExternalId);
  }

  @Test
  void shouldBindOrder() {
    step.process(context, List.of(command));
    assertEquals(Set.of(expectedOrder), context.boundTo(command).find(Order.class));
  }
  ```

- **Predictable load, both ways.** The write side reads in initializers and writes in batches. The
  GraphQL read side uses DataLoaders, about 130 of them, each one an `IN (…)` query, so the N+1
  problem is solved where you can see it rather than tuned away in fetch plans.
- **All of PostgreSQL.** `DISTINCT ON`, `ON CONFLICT`, enum types, arrays and `jsonb` are used
  directly and mapped by the same generic code. There's no second persistence style for the hard
  queries, because there's only one style.
- **Time travel as an API feature.** Every GraphQL query takes an effective date. The
  transaction-time bound is fixed when the request starts, so all the batched reads behind one
  response see the same snapshot, even while new versions are being written.
- **A domain without a framework.** The domain module depends on Jackson and a UUID library. The
  ports sit in a module that depends only on the domain, the SQL in an adapter module of its own,
  and the processing module doesn't depend on Spring's transaction support at all.

## What it cost

Owning the persistence means owning its sharp edges. After two years, these are the ones that
showed:

- **Conventions instead of compiler checks.** The row mapper matches columns to fields by name, and
  enum types by class name. Rename a field and nothing fails until that query runs; the history has
  commits that rename a column "so it works with" the mapper.
- **A hand-maintained save order.** The commit order is a list of 68 classes, and only the classes
  on the list get saved. Add an entity type and forget the list, and its rows are silently left out
  of the commit. A unit test that compares the list with the entity classes would catch it in the
  commit stage.
- **Automatic filters are only automatic in generated SQL.** The builder adds the tenant and time
  predicates to every query it writes. The ten hand-written queries have to remember them, and
  code review is all that checks.
- **No optimistic locking.** The initializers read before the write transaction starts, without
  locks, and there's no version column. Idempotent upserts and append-only versions make most races
  harmless, but not all of them: until unique constraints on the external identifiers were added,
  duplicate rows got in, and the migration that added the constraints had to delete them first.
  Fowler's "resolution of concurrency problems" is the half of the Unit of Work the team left to
  the database, which is fine as long as the invariants actually live in the schema.
- **Every sync appends a version**, whether anything changed or not. The history grows with the
  traffic, not with the changes.
- **The adapter tests never touch PostgreSQL.** The persistence unit tests check the generated SQL
  strings against a mocked JDBC template. They're fast, and they can't catch a query that doesn't
  match the schema; only the end-to-end acceptance suite runs against a real database. A thin layer
  of adapter tests on Testcontainers is what I'd add first, as in
  [architecture that keeps the pipeline fast](/blog/fast-development-cycles-made-simple/#architecture-that-keeps-the-pipeline-fast).

None of these is a reason to go back to an ORM. They're the price of making persistence explicit,
and each has a cheap fix that is visible in the code, which is more than you can say for a lazy
collection.

## Cheat sheet

|                   | The ORM pays off               | The ORM becomes the architecture       |
|-------------------|--------------------------------|----------------------------------------|
| The model         | tables behind forms            | rules, versions, history               |
| Reads             | one entity by ID, simple lists | as-of queries, bulk, database features |
| Writes            | one aggregate per request      | batches, idempotent upserts            |
| Transactions      | around one request             | around one explicit commit             |
| Testing the rules | through the database is fine   | in memory, in milliseconds             |

Signs the trap has already sprung:

- `jakarta.persistence` imports in the domain.
- Open session in view is on, or `@Transactional` sits on controllers.
- Workarounds for `LazyInitializationException`: eager fetches added just in case,
  `Hibernate.initialize` calls, DTO projections that exist only to dodge the session.
- Nobody can say which tables a use case writes without reading the SQL log.
- JPQL and native queries side by side for the same tables.
- Unit tests of business rules that need a database.

## Make the database calls visible

The lesson isn't "never use an ORM". A small internal tool in the same repository uses JPA, with a
comment in its build file that states the trade-off better than I can:

> Using JPA for simplicity. Migrate to JDBC should the module start to grow (unlikely)

That's the right call for that tool, and the comment names the condition under which it stops
being right.

The lesson is about where persistence is allowed to happen. Read at the start, decide in memory,
write once at the end, and make each of those boundaries a line you can point at. Plain JDBC can do
it, jOOQ can do it, and so can JPA kept strictly inside an adapter. Only one of them makes the
opposite the default.

If your persistence layer has quietly become your architecture, [get in touch](/#contact).
