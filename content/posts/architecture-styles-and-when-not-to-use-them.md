---
title: Architecture Styles and When Not to Use Them
description: Monolith, modulith, microservices, event-driven, MVC, layered, hexagonal, clean and replicas. What each one buys you, what it costs, and the signs that it is the wrong choice.
date: 2026-10-04
tags: [ article, architecture, ddd, java, spring boot ]
draft: false
---

Most architecture arguments I sit in go wrong in the first five minutes because they compare
things that don't compete. "Should we go hexagonal or microservices?" is a question like "should we
buy a bigger house or a dishwasher?" Both can be good purchases; they answer different questions.

This post walks through the styles that come up most often: monolith, modular monolith,
microservices, event-driven, MVC, layered, hexagonal, clean, and replicas. For each one: what it
buys you, what it costs, and the signs that it's the wrong choice. But most importantly, when not to use them.
Almost every style here is a good idea somewhere and an expensive one everywhere else.

## The three questions you need to answer first

Nearly every name on that list answers one of three independent questions:

1. **How many things do you deploy at the same time?** One artifact, one artifact with hard internal boundaries, or many
   independently deployable services.
2. **Which way do the dependencies point inside a deployable artifact?** In other words, do your business rules depend
   on the web framework and the database, or the other way round?
3. **How many copies run, and where does the data live?** One instance, several behind a load balancer, a database with
   read replicas.

<figure class="diagram" data-title="three questions">
<svg viewBox="0 0 360 272" role="img" aria-label="Three rows of choices, simplest on the left. Deploy: monolith, modulith (highlighted), microservices. Code: MVC, layered, hexagonal (highlighted), clean. Run: one instance, replicas (highlighted), read replicas.">
<text class="start" x="2" y="16"><tspan class="on">deploy</tspan> how many deployables?</text>
<path class="wire" d="M2 50H358"/>
<rect class="box" x="2" y="34" width="110" height="32" rx="4"/>
<rect class="core" x="125" y="34" width="110" height="32" rx="4"/>
<rect class="box" x="248" y="34" width="110" height="32" rx="4"/>
<text x="57" y="50">monolith</text>
<text x="180" y="50">modulith</text>
<text x="303" y="50">microservices</text>
<text class="start" x="2" y="116"><tspan class="on">code</tspan> which way do dependencies point?</text>
<path class="wire" d="M2 150H358"/>
<rect class="box" x="2" y="134" width="80" height="32" rx="4"/>
<rect class="box" x="94" y="134" width="80" height="32" rx="4"/>
<rect class="core" x="186" y="134" width="80" height="32" rx="4"/>
<rect class="box" x="278" y="134" width="80" height="32" rx="4"/>
<text x="42" y="150">MVC</text>
<text x="134" y="150">layered</text>
<text x="226" y="150">hexagonal</text>
<text x="318" y="150">clean</text>
<text class="start" x="2" y="216"><tspan class="on">run</tspan> how many copies?</text>
<path class="wire" d="M2 250H358"/>
<rect class="box" x="2" y="234" width="110" height="32" rx="4"/>
<rect class="core" x="125" y="234" width="110" height="32" rx="4"/>
<rect class="box" x="248" y="234" width="110" height="32" rx="4"/>
<text x="57" y="250">1 instance</text>
<text x="180" y="250">replicas</text>
<text x="303" y="250">read replicas</text>
</svg>
<figcaption>The answers to the questions boil down to three independent choices with the simplest ones on the left. Green marks where most business systems I work on end up.</figcaption>
</figure>

Because the questions are independent, the answers combine freely. A modular monolith with
hexagonal modules running as three replicas is a perfectly ordinary system. So is a layered
Spring Boot application on a single VM. The expensive mistake is answering one question with an
answer to another: "we need to scale, so we need microservices".

## How many things do you deploy at the same time?

### Monolith

A true classic – one codebase, one build, one deployable, usually one database. "Monolith" has become an insult, which
is unfair: most successful products started as one, and plenty of them still are. What people mean when they use the
word
as an insult is the big ball of mud, where every part reaches into every other part.

<figure class="diagram" data-title="monolith">
<svg viewBox="0 0 360 224" role="img" aria-label="One deployable, shop.jar, containing web, orders, catalog, users, billing and reports, all wired to each other, on top of one database.">
<rect class="box dim on" x="10" y="10" width="340" height="146" rx="6"/>
<text class="on start" x="22" y="28">shop.jar</text>
<path class="wire" d="M76 61H284M76 121H284M76 61V121M180 61V121M284 61V121M76 61L180 121M180 61L76 121M180 61L284 121M284 61L180 121M76 61L284 121M76 121L284 61"/>
<rect class="box" x="34" y="46" width="84" height="30" rx="4"/>
<rect class="box" x="138" y="46" width="84" height="30" rx="4"/>
<rect class="box" x="242" y="46" width="84" height="30" rx="4"/>
<rect class="box" x="34" y="106" width="84" height="30" rx="4"/>
<rect class="box" x="138" y="106" width="84" height="30" rx="4"/>
<rect class="box" x="242" y="106" width="84" height="30" rx="4"/>
<text x="76" y="61">web</text>
<text x="180" y="61">orders</text>
<text x="284" y="61">catalog</text>
<text x="76" y="121">users</text>
<text x="180" y="121">billing</text>
<text x="284" y="121">reports</text>
<path class="wire" d="M180 156V176"/>
<path class="box" d="M136 182v24a44 6 0 0 0 88 0v-24"/>
<ellipse class="box" cx="180" cy="182" rx="44" ry="6"/>
<text x="180" y="199">database</text>
</svg>
<figcaption>One deployable, one database. The risk is the mesh: with nothing in the way, eventually everything ends up calling everything.</figcaption>
</figure>

**When it works?**

- The product is new, and the domain is still being discovered. The boundaries you would draw today
  will be wrong in six months, and moving code around inside one repository is a refactoring, not
  a migration.
- One team owns the whole thing.
- You need to ship and learn quickly: one build, one deploy, one log, one debugger, and database
  transactions that simply work.
- The load fits on a few machines, which describes most business software.

**When to avoid?**

- Several teams change the same codebase and start queuing behind each other: merge conflicts,
  release trains, "who broke the build?"
- Parts of the system have very different runtime needs, such as a CPU-hungry pricing engine next
  to a CRUD admin screen. Replicas or a separate worker process often fix that without a split, but this is a clear sign
  you need to move toward another architecture pattern.
- Nothing stops one part from reaching into another. That is the real failure mode: after a few
  years `OrderService` calls `UserRepository` directly and every change touches everything. It's
  also why the next style exists.

### Modular monolith (modulith)

Still one deployable, but split inside along business capabilities, the bounded contexts of DDD.
Each module exposes a small public API and hides everything else. Modules talk through those APIs
or through in-process events, and each one owns its own business logic, tables, and internal design patterns.

<figure class="diagram" data-title="modular monolith">
<svg viewBox="0 0 360 266" role="img" aria-label="One deployable, shop.jar, containing three modules: orders, billing and shipping. Each has a public api on top and hidden internals. The modules connect through an in-process events channel, and each has its own schema in one database.">
<rect class="box dim on" x="10" y="10" width="340" height="176" rx="6"/>
<text class="on start" x="22" y="28">shop.jar</text>
<text class="note on end" x="338" y="28">in-process events</text>
<path class="wire on" d="M36 50H324M68 50V75M180 50V75M292 50V75"/>
<rect class="box" x="22" y="84" width="92" height="92" rx="4"/>
<rect class="box" x="134" y="84" width="92" height="92" rx="4"/>
<rect class="box" x="246" y="84" width="92" height="92" rx="4"/>
<rect class="core" x="48" y="75" width="40" height="18" rx="3"/>
<rect class="core" x="160" y="75" width="40" height="18" rx="3"/>
<rect class="core" x="272" y="75" width="40" height="18" rx="3"/>
<text class="note on" x="68" y="84">api</text>
<text class="note on" x="180" y="84">api</text>
<text class="note on" x="292" y="84">api</text>
<text x="68" y="110">orders</text>
<text x="180" y="110">billing</text>
<text x="292" y="110">shipping</text>
<rect class="wire dash" x="34" y="126" width="68" height="36" rx="3"/>
<rect class="wire dash" x="146" y="126" width="68" height="36" rx="3"/>
<rect class="wire dash" x="258" y="126" width="68" height="36" rx="3"/>
<text class="note" x="68" y="144">internal</text>
<text class="note" x="180" y="144">internal</text>
<text class="note" x="292" y="144">internal</text>
<path class="wire" d="M68 176V209M180 176V209M292 176V209"/>
<path class="box" d="M38 214v20a30 5 0 0 0 60 0v-20"/>
<ellipse class="box" cx="68" cy="214" rx="30" ry="5"/>
<path class="box" d="M150 214v20a30 5 0 0 0 60 0v-20"/>
<ellipse class="box" cx="180" cy="214" rx="30" ry="5"/>
<path class="box" d="M262 214v20a30 5 0 0 0 60 0v-20"/>
<ellipse class="box" cx="292" cy="214" rx="30" ry="5"/>
<text class="note" x="180" y="256">one database, a schema per module</text>
</svg>
<figcaption>Still one deployable, but each module shows a small API and keeps its internals to itself.</figcaption>
</figure>

**When it works?**

- You are starting something new or rewriting something old. For most teams this should be the
  default: real boundaries without paying for the network and deployment complexity.
- You understand the domain well enough to name the contexts, but not well enough to bet on network
  contracts between them.
- You want to keep the option of extracting a service later. A module with its own API and its own
  tables is most of the way to being a service already.

**When to avoid?**

- Teams need to release on independent schedules or with different stacks. Modules still share one
  build and one deployment.
- One module needs to scale or fail on its own, such as an import job that starves the web requests
  under load.

**Be careful if...**

- Nobody will enforce the boundaries. Unenforced modules decay into a monolith with more folders.

Enforce them in the build rather than in a wiki page:

```java
class ModularityTests {

  @Test
  void modulesOnlyTalkThroughTheirPublicApi() {
    ApplicationModules.of(ShopApplication.class).verify();
  }
}
```

With [Spring Modulith](https://spring.io/projects/spring-modulith) every direct sub-package of the
application package is a module, and `verify()` fails on cycles between modules and on references
into another module's internals. A boundary that fails the build stays a boundary.

### Microservices

Independently deployable services, each owning its data and owned by one team, talking over the
network through HTTP, gRPC, or messages. The defining property is independence: a team can change,
test, deploy, and scale its service without coordinating a release with anybody else.

<figure class="diagram" data-title="microservices">
<svg viewBox="0 0 360 218" role="img" aria-label="An api gateway calls three services, orders, billing and shipping, over the network. Orders calls billing and billing calls shipping. Each service has its own database.">
<defs><marker id="micro-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="110" y="10" width="140" height="32" rx="4"/>
<text x="180" y="26">api gateway</text>
<rect class="box on" x="24" y="82" width="84" height="40" rx="4"/>
<rect class="box on" x="138" y="82" width="84" height="40" rx="4"/>
<rect class="box on" x="252" y="82" width="84" height="40" rx="4"/>
<text x="66" y="102">orders</text>
<text x="180" y="102">billing</text>
<text x="294" y="102">shipping</text>
<path class="wire dash" d="M150 42L66 82" marker-end="url(#micro-tip)"/>
<path class="wire dash" d="M180 42V82" marker-end="url(#micro-tip)"/>
<path class="wire dash" d="M210 42L294 82" marker-end="url(#micro-tip)"/>
<path class="wire dash" d="M108 102H138" marker-end="url(#micro-tip)"/>
<path class="wire dash" d="M222 102H252" marker-end="url(#micro-tip)"/>
<path class="wire" d="M66 122V155M180 122V155M294 122V155"/>
<path class="box" d="M38 160v20a28 5 0 0 0 56 0v-20"/>
<ellipse class="box" cx="66" cy="160" rx="28" ry="5"/>
<path class="box" d="M152 160v20a28 5 0 0 0 56 0v-20"/>
<ellipse class="box" cx="180" cy="160" rx="28" ry="5"/>
<path class="box" d="M266 160v20a28 5 0 0 0 56 0v-20"/>
<ellipse class="box" cx="294" cy="160" rx="28" ry="5"/>
<text class="note" x="180" y="208">own code, own pipeline, own data, own team</text>
</svg>
<figcaption>Separate deployables with separate data. Dashed arrows cross the network, which can be slow, fail, or time out.</figcaption>
</figure>

**When it works?**

- You have several teams that need to release independently. Microservices are mostly an
  organizational tool: [Conway's law](https://martinfowler.com/bliki/ConwaysLaw.html) starts working with you instead of
  against you.
- The boundaries are proven, ideally because they have been stable as modules in a modulith for a
  while.
- Parts have genuinely different needs: payments isolated for compliance, search scaled on its own,
  a machine-learning component in Python.
- The platform is in place: a pipeline per service, containers and orchestration, centralized logs,
  tracing, contract tests.

**When to avoid?**

- There is one team. You would pay the distributed-systems tax (partial failure, eventual
  consistency, versioned APIs, debugging across process boundaries) for benefits that only multiple
  teams collect.
- The domain is young. A wrong boundary inside a monolith is a refactoring; between services this becomes
  a migration with two deployments and a data move.
- Services share a database or have to be deployed together. That is a distributed monolith, the
  worst of both worlds.
- One user request turns into a chain of synchronous calls. Availability multiplies: five services
  at 99.9% each give you about 99.5%, three and a half hours of downtime a month instead of 43
  minutes.

**Keep in mind**

- Most companies don't need microservices. They scale software on an organizational level, not a technical one. Beware
  the distributed monolith!

### Event-driven

Once there's more than one module or service, the next question is how they talk. In an
event-driven design a part states a fact, `OrderPlaced`, and doesn't know or care who listens. It
works inside a modulith, with Spring application events, as well as between services, through a
broker such as Kafka or RabbitMQ.

<figure class="diagram" data-title="event-driven">
<svg viewBox="0 0 360 194" role="img" aria-label="Orders publishes an OrderPlaced event to a broker. Billing, shipping and email each receive it asynchronously.">
<defs><marker id="event-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker><marker id="event-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="8" y="84" width="84" height="36" rx="4"/>
<text x="50" y="102">orders</text>
<rect class="box on" x="128" y="84" width="104" height="36" rx="3"/>
<rect class="core" x="206" y="84" width="26" height="36"/>
<path class="wire on" d="M154 84V120M180 84V120"/>
<text class="on" x="180" y="68">OrderPlaced</text>
<text class="note" x="180" y="136">broker</text>
<rect class="box" x="268" y="20" width="84" height="36" rx="4"/>
<rect class="box" x="268" y="84" width="84" height="36" rx="4"/>
<rect class="box" x="268" y="148" width="84" height="36" rx="4"/>
<text x="310" y="38">billing</text>
<text x="310" y="102">shipping</text>
<text x="310" y="166">email</text>
<path class="wire on" d="M92 102H128" marker-end="url(#event-tip-on)"/>
<path class="wire dash" d="M232 102L268 38" marker-end="url(#event-tip)"/>
<path class="wire dash" d="M232 102H268" marker-end="url(#event-tip)"/>
<path class="wire dash" d="M232 102L268 166" marker-end="url(#event-tip)"/>
</svg>
<figcaption>Orders states the fact once. The listeners react in their own time, and adding a fourth one doesn't touch orders.</figcaption>
</figure>

**When it works?**

- One fact has many interested parties, and the publisher shouldn't have to know them all: an order
  is placed, so invoice it, ship it, email the customer, update the reporting.
- The work can happen later. The customer doesn't need to wait for the confirmation email.
- You need to absorb load spikes or keep going while one consumer is down.
- The history matters. A stream of events is a natural audit log.

**When to avoid?**

- The caller needs an answer now, such as checking stock before confirming an order.
- The flow must be easy to follow. With pure choreography the business process lives nowhere; it's
  spread across listeners, and "why didn't this order ship?" means tracing messages through a
  broker.
- You aren't ready for what a broker actually guarantees. Are your consumers idempotent? Can
  they handle events arriving out of order? Does a transactional outbox make sure an event is
  published if and only if its data is committed?

## Which way do the dependencies point?

Inside any deployable, whether it's a monolith, a module, or a service, you still decide how the code
is organized. The four styles below are a progression of one idea: stop the business rules from
depending on the delivery mechanism and the database, so they can be read, tested, and changed on
their own.

### MVC

Model-View-Controller splits a user interface into three roles: the controller handles input, the
model holds the state, the view renders it. In Spring that's a `@Controller`, a Thymeleaf template
and the model attributes passed between them; in a REST API the view is the JSON serializer.

<figure class="diagram" data-title="mvc">
<svg viewBox="0 0 360 196" role="img" aria-label="A request reaches the controller. The controller updates the model and selects a view; the view reads the model and renders the response.">
<defs><marker id="mvc-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker><marker id="mvc-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="30" y="40" width="110" height="36" rx="4"/>
<rect class="box" x="220" y="40" width="110" height="36" rx="4"/>
<rect class="box" x="125" y="148" width="110" height="36" rx="4"/>
<text x="85" y="58">controller</text>
<text x="275" y="58">model</text>
<text x="180" y="166">view</text>
<path class="wire on" d="M85 4V40" marker-end="url(#mvc-tip-on)"/>
<text class="note on start" x="95" y="20">request</text>
<path class="wire on" d="M125 166H40" marker-end="url(#mvc-tip-on)"/>
<text class="note on" x="78" y="154">response</text>
<path class="wire" d="M140 58H220" marker-end="url(#mvc-tip)"/>
<text class="note" x="180" y="46">updates</text>
<path class="wire" d="M110 76L160 148" marker-end="url(#mvc-tip)"/>
<text class="note end" x="126" y="116">selects</text>
<path class="wire" d="M200 148L250 76" marker-end="url(#mvc-tip)"/>
<text class="note start" x="234" y="116">reads</text>
</svg>
<figcaption>Input, state and rendering, kept apart. Nothing here says where the business rules or the database go.</figcaption>
</figure>

MVC is a presentation pattern, not an application architecture. It says nothing about where
business rules or persistence belong, which is how controllers end up 400 lines long.

**When it works?**

- You are building a server-rendered web UI, an admin tool, or a small CRUD application.
- You need the outermost layer of any of the styles below. MVC makes a perfectly good web adapter.

**When to avoid?**

- It is the whole architecture of something with real business rules. The rules drift into the
  controllers, or into a "model" that every part of the code mutates.
- The same logic has to serve several channels: web, API, batch jobs, messages. Logic inside a
  controller can only be reached through HTTP.

### Layered

Horizontal layers, each calling only the one below: presentation, application, domain,
persistence. It's the `controller`, `service` and `repository` packages that most Spring Boot
projects grow out of habit, and the style most Java developers already know.

<figure class="diagram" data-title="layered">
<svg viewBox="0 0 360 250" role="img" aria-label="Four stacked layers, each calling the one below: presentation, application, domain and persistence, with the database at the bottom. The domain depends on persistence.">
<defs><marker id="layer-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker><marker id="layer-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="40" y="8" width="280" height="34" rx="4"/>
<rect class="box" x="40" y="58" width="280" height="34" rx="4"/>
<rect class="box on" x="40" y="108" width="280" height="34" rx="4"/>
<rect class="box" x="40" y="158" width="280" height="34" rx="4"/>
<text class="start" x="56" y="25">presentation</text>
<text class="start" x="56" y="75">application</text>
<text class="on start" x="56" y="125">domain</text>
<text class="start" x="56" y="175">persistence</text>
<text class="note end" x="304" y="25">@Controller</text>
<text class="note end" x="304" y="75">@Service</text>
<text class="note end" x="304" y="125">entities, rules</text>
<text class="note end" x="304" y="175">@Repository</text>
<path class="wire" d="M180 42V58" marker-end="url(#layer-tip)"/>
<path class="wire" d="M180 92V108" marker-end="url(#layer-tip)"/>
<path class="wire on" d="M180 142V158" marker-end="url(#layer-tip-on)"/>
<path class="wire" d="M180 192V212" marker-end="url(#layer-tip)"/>
<path class="box" d="M136 218v20a44 6 0 0 0 88 0v-20"/>
<ellipse class="box" cx="180" cy="218" rx="44" ry="6"/>
<text x="180" y="231">database</text>
</svg>
<figcaption>Each layer calls only the one below. Simple and familiar, but the domain ends up depending on persistence.</figcaption>
</figure>

**When it works?**

- The application is mostly CRUD with modest rules, and the team wants a convention everybody
  already understands.
- You need a structure quickly and want new people productive on their first day.

**When to avoid?**

- The domain logic is rich. The domain sits on top of persistence, so JPA entities become the
  domain model, transactions leak upwards, and testing a pricing rule needs a database or a pile of
  mocks.
- Most requests sink straight through: a controller calls a service that calls a repository and
  adds nothing on the way.
- Layer cuts the packages across a large codebase. A feature change touches every package,
  and nothing in the structure tells you what the system does. Layers inside modules age much
  better than layers across the whole application.

### Hexagonal (ports and adapters)

[Alistair Cockburn's idea](https://alistair.cockburn.us/hexagonal-architecture): the application core, meaning the
domain and its use cases, sits in the
middle and defines ports. Driving ports describe what the application offers ("place an order"),
driven ports what it needs ("store an order", "charge a card"). Adapters on the outside plug into
the ports: a REST controller or a Kafka listener drives the application, it drives a JPA repository or a
payment client. The core depends on nothing technical, and every adapter depends on
the core.

<figure class="diagram" data-title="hexagonal">
<svg viewBox="0 0 360 204" role="img" aria-label="A hexagon holds the use cases, with the domain at its centre and ports on its edges. On the left, a REST adapter and the tests drive the application; on the right, a JPA adapter and a Stripe adapter are driven by it. Every arrow points into the hexagon.">
<defs><marker id="hex-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<polygon class="box tint on" points="260,120 220,189 140,189 100,120 140,51 220,51"/>
<polygon class="core" points="220,120 200,154.6 160,154.6 140,120 160,85.4 200,85.4"/>
<text class="note on" x="180" y="68">use cases</text>
<text x="180" y="120">domain</text>
<rect class="box on" x="114" y="79.5" width="12" height="12" rx="2"/>
<rect class="box on" x="114" y="148.5" width="12" height="12" rx="2"/>
<rect class="box on" x="234" y="79.5" width="12" height="12" rx="2"/>
<rect class="box on" x="234" y="148.5" width="12" height="12" rx="2"/>
<text class="note" x="42" y="44">driving</text>
<text class="note" x="318" y="44">driven</text>
<rect class="box" x="8" y="69.5" width="68" height="32" rx="4"/>
<rect class="box" x="8" y="138.5" width="68" height="32" rx="4"/>
<rect class="box" x="284" y="69.5" width="68" height="32" rx="4"/>
<rect class="box" x="284" y="138.5" width="68" height="32" rx="4"/>
<text x="42" y="85.5">REST</text>
<text x="42" y="154.5">tests</text>
<text x="318" y="85.5">JPA</text>
<text x="318" y="154.5">Stripe</text>
<path class="wire on" d="M76 85.5H114" marker-end="url(#hex-tip-on)"/>
<path class="wire on" d="M76 154.5H114" marker-end="url(#hex-tip-on)"/>
<path class="wire on" d="M284 85.5H246" marker-end="url(#hex-tip-on)"/>
<path class="wire on" d="M284 154.5H246" marker-end="url(#hex-tip-on)"/>
</svg>
<figcaption>The core owns the ports and adapters plug in from outside. Every arrow points inwards, so the tests are just another adapter.</figcaption>
</figure>

In code the port is an interface shaped by the domain, and each adapter is a class at the edge:

```java
// core: the port speaks the domain's language, not the vendor's
public interface PaymentGateway {
  PaymentResult charge(OrderId order, Money amount);
}

// adapter: the only class that knows which payment provider you use
@Component
class StripePaymentGateway implements PaymentGateway { /* ... */
}

// test: a fake adapter, so use-case tests need no Spring context and no network
class ApprovingPaymentGateway implements PaymentGateway {
  @Override
  public PaymentResult charge(OrderId order, Money amount) {
    return PaymentResult.approved();
  }
}
```

**When it works?**

- There are business rules worth protecting: pricing, eligibility, scheduling, anything you want to
  read without a framework in the way.
- There are several ways in (REST, messages, batch) or out (a payment provider you might switch, a
  legacy system you plan to retire).
- You practise TDD. Use cases tested through their ports with fake adapters run in milliseconds, so
  you run them all the time.
- The system will outlive several framework versions, which the rules almost always do.

**When to avoid?**

- It's CRUD with no rules. You'll write a port, an adapter, and two mappers to move a form into a
  table, and every one of them is just a ceremony.
- The service is small and short-lived, like a webhook relay. The whole thing is an adapter.
- The team adopts the folder names without the rule: an interface with a single implementation in
  front of everything, mappers at every boundary, and the domain still importing
  `jakarta.persistence`.

### Clean and onion

[Robert C. Martin's Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
and [Jeffrey Palermo's onion architecture](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) draw the
same idea as concentric rings: entities in the middle, use cases around them, interface adapters next, frameworks and
drivers outside. Plus one rule to rule them all: source code dependencies only point inwards. Clean adds more
prescriptions
on top, with a class per use case, input and output boundaries, presenters, and request and response models.

<figure class="diagram" data-title="clean / onion">
<svg viewBox="0 0 360 256" role="img" aria-label="Four concentric rings: frameworks and drivers on the outside, then interface adapters, then use cases, with entities at the centre. Arrows from both sides point inwards.">
<defs><marker id="clean-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker><path id="clean-top-104" d="M76 128A104 104 0 0 1 284 128"/><path id="clean-top-76" d="M104 128A76 76 0 0 1 256 128"/><path id="clean-top-48" d="M132 128A48 48 0 0 1 228 128"/><path id="clean-bottom-104" d="M76 128A104 104 0 0 0 284 128"/><path id="clean-bottom-76" d="M104 128A76 76 0 0 0 256 128"/></defs>
<circle class="box dim" cx="180" cy="128" r="118"/>
<circle class="box" cx="180" cy="128" r="90"/>
<circle class="box tint" cx="180" cy="128" r="62"/>
<circle class="core" cx="180" cy="128" r="34"/>
<text class="note"><textPath href="#clean-top-104" startOffset="50%">frameworks &amp; drivers</textPath></text>
<text class="note"><textPath href="#clean-top-76" startOffset="50%">interface adapters</textPath></text>
<text class="note on"><textPath href="#clean-top-48" startOffset="50%">use cases</textPath></text>
<text class="note"><textPath href="#clean-bottom-104" startOffset="50%">Spring, JPA, Kafka</textPath></text>
<text class="note"><textPath href="#clean-bottom-76" startOffset="50%">controllers, gateways</textPath></text>
<text x="180" y="128">entities</text>
<path class="wire on" d="M4 128H144" marker-end="url(#clean-tip-on)"/>
<path class="wire on" d="M356 128H216" marker-end="url(#clean-tip-on)"/>
</svg>
<figcaption>The hexagon drawn as rings. Source code dependencies are inverted and only point inwards.</figcaption>
</figure>

**When it works?**

- You would pick hexagonal, and the system is large enough, with enough contributors that explicit
  guidance on where each kind of class lives pays for itself.
- You are building a long-lived, domain-heavy system where consistency across teams matters more
  than brevity.

**When to avoid?**

- The service is small or medium-sized. The prescribed rings multiply the classes per feature, and
  a one-field change that touches six files is a smell, not a sign of rigor.
- The book is followed to the letter instead of the dependency rule. In practice, hexagonal with a
  clear use-case layer delivers most of the value with fewer moving parts.

Whichever ring diagram you prefer, the dependency rule is cheap to enforce with
[ArchUnit](https://www.archunit.org/):

```java

@ArchTest
static final ArchRule dependenciesPointInwards = onionArchitecture()
  .domainModels("..domain.model..")
  .domainServices("..domain.service..")
  .applicationServices("..application..")
  .adapter("web", "..adapter.web..")
  .adapter("persistence", "..adapter.persistence..")
  .adapter("payments", "..adapter.payments..");
```

## How many copies run?

The third question is about runtime, and it's independent of the other two. Any of the styles
above can run as one instance or as many.

<figure class="diagram" data-title="replicas">
<svg viewBox="0 0 360 222" role="img" aria-label="A load balancer spreads requests over three identical copies of shop.jar. All writes go to the primary database; reads can go to replicas, which the primary updates asynchronously.">
<defs><marker id="rep-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker><marker id="rep-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="110" y="8" width="140" height="32" rx="4"/>
<text x="180" y="24">load balancer</text>
<rect class="box on" x="22" y="80" width="92" height="36" rx="4"/>
<rect class="box on" x="134" y="80" width="92" height="36" rx="4"/>
<rect class="box on" x="246" y="80" width="92" height="36" rx="4"/>
<text x="68" y="98">shop.jar</text>
<text x="180" y="98">shop.jar</text>
<text x="292" y="98">shop.jar</text>
<path class="wire" d="M150 40L68 80" marker-end="url(#rep-tip)"/>
<path class="wire" d="M180 40V80" marker-end="url(#rep-tip)"/>
<path class="wire" d="M210 40L292 80" marker-end="url(#rep-tip)"/>
<path class="wire" d="M68 116V136M180 116V136M292 116V136M68 136H292"/>
<path class="box on" d="M48 178v30a48 6 0 0 0 96 0v-30"/>
<ellipse class="box on" cx="96" cy="178" rx="48" ry="6"/>
<text x="96" y="196">primary</text>
<path class="box" d="M224 172v30a48 6 0 0 0 96 0v-30"/>
<ellipse class="box" cx="272" cy="172" rx="48" ry="6"/>
<path class="box" d="M216 178v30a48 6 0 0 0 96 0v-30"/>
<ellipse class="box" cx="264" cy="178" rx="48" ry="6"/>
<text x="264" y="196">replicas</text>
<path class="wire on" d="M96 136V172" marker-end="url(#rep-tip-on)"/>
<text class="note on start" x="104" y="154">writes</text>
<path class="wire" d="M264 136V166" marker-end="url(#rep-tip)"/>
<text class="note start" x="272" y="152">reads</text>
<path class="wire on dash" d="M144 196H216" marker-end="url(#rep-tip-on)"/>
<text class="note" x="180" y="186">async</text>
</svg>
<figcaption>Identical copies behind a load balancer. Writes go to one primary; reads can go to replicas that trail it slightly.</figcaption>
</figure>

### Application replicas

Several identical instances of the same artefact behind a load balancer. A monolith with three
replicas is a normal, boring, and robust setup, and usually the cheapest scaling step there is.

**When it works?**

- You need availability: a node can die, and a rolling deployment ships a new version without
  downtime.
- Traffic outgrows one machine, and the application is stateless or can be made so.

**When to avoid?**

- State lives in memory: HTTP sessions, local caches, uploads on local disk, in-memory rate limits.
  Move it out, to the database, Redis, or object storage, before you start the second instance.
- Database migrations aren't backwards compatible. During a rolling deployment two versions run
  side by side, so every schema change has to go expand, migrate, contract.
- There are scheduled jobs. Every replica runs every `@Scheduled` method, so the nightly invoice
  run happens three times unless the job takes a lock first.

[ShedLock](https://github.com/lukas-krecan/ShedLock) takes that lock with one annotation and a lock
table:

```java

@Scheduled(cron = "0 0 2 * * *")
@SchedulerLock(name = "nightlyInvoiceRun", lockAtMostFor = "PT30M")
void runNightlyInvoices() {
  invoicing.closeDay(LocalDate.now(clock).minusDays(1));
}
```

### Database read replicas

One primary takes every write operation and streams the changes to replicas that serve reads. CQRS is the
same split one level up, in the model rather than in the database.

**When it works?**

- Reads far outnumber writes, and reports, searches, or exports compete with the transactions on
  the primary.
- You want a warm standby to fail over to.

**When to avoid?**

- Users must see their own writes straight away. Replication is usually asynchronous, so a replica
  can trail the primary; send those reads to the primary.
- Writes are the bottleneck. Replicas don't scale writes at all. That takes partitioning or
  sharding, which is a much bigger decision.

## Cheat sheet

| Style         | When it works?                          | When to avoid?                      |
|---------------|-----------------------------------------|-------------------------------------|
| Monolith      | one team, new domain                    | several teams queue for one release |
| Modulith      | most new systems and rewrites           | teams need independent releases     |
| Microservices | many teams, proven boundaries, platform | one team, young domain              |
| Event-driven  | one fact, many reactions, work can wait | the caller needs an answer now      |
| MVC           | server-rendered UI, CRUD                | it's the only architecture you have |
| Layered       | CRUD with modest rules                  | rich domain logic                   |
| Hexagonal     | rules worth protecting, TDD             | plain CRUD                          |
| Clean / onion | large, long-lived, many contributors    | small and medium services           |
| Replicas      | availability, read-heavy load           | in-memory state, write-heavy load   |

## Where I usually land

For most business systems I work on, the answers come out the same way: a modular monolith,
hexagonal inside the modules that hold real rules and plain layers in the ones that are CRUD,
events between modules, and two or three replicas behind a load balancer. All of it is enforced by
tests in the pipeline rather than by a diagram on a wiki.

<figure class="diagram" data-title="where I usually land">
<svg viewBox="0 0 360 236" role="img" aria-label="Three stacked copies of shop.jar. Inside, three modules: pricing and orders are hexagonal, catalog is layered. The modules share an events channel, and the application uses one database.">
<rect class="box dim" x="26" y="8" width="324" height="160" rx="6"/>
<rect class="box dim" x="18" y="16" width="324" height="160" rx="6"/>
<rect class="box dim on" x="10" y="24" width="324" height="160" rx="6"/>
<text class="on start" x="22" y="42">shop.jar</text>
<text class="note end" x="322" y="42">&times;3 replicas</text>
<rect class="box" x="22" y="56" width="92" height="86" rx="4"/>
<rect class="box" x="126" y="56" width="92" height="86" rx="4"/>
<rect class="box" x="230" y="56" width="92" height="86" rx="4"/>
<polygon class="core" points="79,76 73.5,85.5 62.5,85.5 57,76 62.5,66.5 73.5,66.5"/>
<rect class="box on" x="160" y="66" width="24" height="5" rx="1"/>
<rect class="box on" x="160" y="74" width="24" height="5" rx="1"/>
<rect class="box on" x="160" y="82" width="24" height="5" rx="1"/>
<polygon class="core" points="287,76 281.5,85.5 270.5,85.5 265,76 270.5,66.5 281.5,66.5"/>
<text x="68" y="104">pricing</text>
<text x="172" y="104">catalog</text>
<text x="276" y="104">orders</text>
<text class="note" x="68" y="124">hexagonal</text>
<text class="note" x="172" y="124">layered</text>
<text class="note" x="276" y="124">hexagonal</text>
<path class="wire on" d="M40 162H304M68 142V162M172 142V162M276 142V162"/>
<text class="note on" x="120" y="173">events</text>
<path class="wire" d="M172 184V198"/>
<path class="box" d="M128 204v20a44 6 0 0 0 88 0v-20"/>
<ellipse class="box" cx="172" cy="204" rx="44" ry="6"/>
<text x="172" y="217">database</text>
</svg>
<figcaption>One deployable, modules inside, each structured as much as its rules deserve, and a few copies running.</figcaption>
</figure>

A module becomes a service when it has a reason to: a separate team, a different scaling or
availability profile, a compliance boundary. Extracting a service is always possible later and much cheaper when the
boundaries were real from the start. Going back after the fact is the expensive direction.

If you are weighing one of these decisions right now, [get in touch](/#contact).
