---
title: Fast Development Cycles Made Simple
description: A team ships as fast as it finds out whether a change is any good. TDD answers in minutes, ATDD says when a feature is done, and the deployment pipeline asks both again on every commit.
date: 2026-11-04
tags: [ article ]
draft: false
---

What do the teams that ship well have in common? Not a framework, not a cloud provider, not a
methodology with a capital letter. Ask them how long a one-line change takes to reach production
and they answer in minutes or hours. Ask a struggling team and they answer with a calendar: the end
of the sprint, the next release train, after the change advisory board meets.

The difference is rarely talent, and never typing speed. It's how quickly a team finds out whether
a change is any good. The fastest answers come from two loops that start at the developer's desk:
test-driven development (TDD), which answers in minutes, and acceptance test-driven development
(ATDD), which says when a feature is done. This post walks through both, and how the deployment
pipeline closes them on every commit.

## Engineering is learning, so shorten the loop

Dave Farley's *Modern Software Engineering* starts from a definition:

> Software engineering is the application of an empirical, scientific approach to finding efficient, economic solutions
> to practical problems in software.

The word that matters is *empirical*. Nobody knows in advance whether a change works, or whether it
breaks something three modules away. We find out by trying it and looking at the result, so a team
learns exactly as fast as its feedback loops allow, and no faster.

Farley splits the job into two halves: **learning**, in small steps guided by fast feedback, and
**managing complexity**, through modularity, cohesion, separation of concerns, abstraction and
loose coupling. TDD serves both. It tells you within minutes whether the code does what you meant,
and it pushes the design towards those five properties on every cycle.

## TDD is not unit testing

Tests written after the code measure coverage. They mirror the implementation they were written
against and put no pressure on its design. Written first, they become something else:

- **A specification.** The test describes behaviour before it exists, then proves it, and goes on
  documenting it.
- **The first user of the code.** If the code is awkward to call from a test, it will be awkward to
  call from everywhere else, and you find out before you've built it.
- **A unit of behaviour.** A unit is something with an observable outcome, not a class or a method.
  Name the test after it, in the language of the domain: `shouldApplyTenPercentDiscountAbove100`,
  not `testCalculate2`.

In [Farley's words](https://www.davefarley.net/?p=220):

> Test Driven Development is only partially about testing, of much greater importance is its impact on design.

## Red, green, refactor

The cycle has three steps, and each is a different hat: you wear one at a time, never two.

**Red: specify the next behaviour.** Write one failing test for the smallest next step, then run it
and watch it fail, which proves that it can fail, and for the reason you expect. Say a shop gives
10% off orders above €100:

```java
@Test
void shouldApplyTenPercentDiscountAbove100() {
    var basket = new ShoppingBasket();
    basket.add(item("TDD", eur(120)));
    assertEquals(eur(108), basket.total());
}
```

It doesn't compile yet, which counts as red. Yet the test has already settled the design questions
that matter, before a line of production code exists: the basket owns the calculation (tell, don't
ask), money is a type rather than a `double`, and the caller never sees the discount. That's
feedback on the design, arriving while changing the interface costs nothing.

**Green: make it work.** Write the simplest code that passes, even if it looks naive, and add no
new design. If returning a constant would pass, add a second example, a €100 basket that pays full
price, to force the real logic, then write the obvious code:

```java
public Money total() {
    var sum = items.stream()
            .map(Item::price)
            .reduce(Money.ZERO, Money::plus);
    if (sum.isGreaterThan(eur(100))) {
        return sum.percentage(90);
    }
    return sum;
}
```

Stuck for more than a few minutes? Revert and take a smaller step.

**Refactor: make it good.** On green, and only on green, improve both the production code and the
tests in small steps, running the tests after each one. Here that means pulling `subtotal()` and
`applyDiscount()` out of `total()` and naming the threshold. A second discount rule would be the cue
to extract a `DiscountPolicy`. Not before.

A cycle takes a minute or two and ends on green, so commit on every green. When something breaks,
you are never more than a few minutes from working code, and you know which change broke it.

## Listen to your tests

Every cycle answers two questions. Red or green tells you whether the code does what you meant. How
hard the test was to write tells you whether the design is any good:

| When the test...                   | the design is telling you...                     |
|------------------------------------|--------------------------------------------------|
| is hard to write                   | the responsibility or the contract is unclear    |
| needs many mocks                   | the unit has too many collaborators              |
| asserts interactions, not outcomes | it tests the implementation, not the behaviour   |
| needs private state                | encapsulation is broken                          |
| breaks with every new feature      | the parts are tightly coupled                    |
| has a long setup                   | coupling is high, or a parameter object is missing |

Fix the design, not the test. In the post quoted above, Farley lists what makes code testable
(modular, loosely coupled, cohesive, with good separation of concerns and information hiding) and
adds: "Precisely the same properties as those of high quality code."

The same discipline keeps the tests fast. Test doubles belong at the edges of the system: the UI,
files, storage and external APIs. Mock only where the interaction is the behaviour, like telling a
customer their order is confirmed, and even there a hand-written `RecordingNotifier` that remembers
the order it was told about reads better than a stack of `when().thenReturn()`. Everywhere else,
assert outcomes. Tests like these don't start a framework, open a database or touch the network, so
thousands of them run in seconds, and you can run them all on every change.

## ATDD: the outer loop

Unit tests tell developers that the code does what they meant. Acceptance tests tell everybody that
the system does what its users need. ATDD writes them first as well, as executable specifications:
the behaviour seen from outside, *what* the system does, never *how*. They run against the deployed
release candidate, so they also prove that it deploys and is configured correctly.

Developers write and maintain them; testers, analysts and the product owner help define the
scenarios. A separate QA team automating tests after the fact is the anti-pattern: developers who
never feel the pain of a brittle test never fix the design that made it brittle.

Together, the two make a double loop:

<figure class="diagram" data-title="the double loop">
<svg viewBox="0 0 360 256" role="img" aria-label="The outer loop, ATDD, starts with the story's acceptance test, written first, which stays red for hours to days. Inside it the inner loop, TDD, runs red, green, refactor over and over, a minute or two per cycle, with a commit on every green. When the acceptance test passes, the feature is done and the outer loop moves on to the next story.">
<defs><marker id="loop-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker><marker id="loop-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="34" y="8" width="318" height="46" rx="4"/>
<rect class="box tint" x="34" y="76" width="318" height="104" rx="4"/>
<rect class="box" x="34" y="202" width="318" height="46" rx="4"/>
<text class="start" x="46" y="24">acceptance test</text>
<text class="note start" x="46" y="41">the story's spec, written first</text>
<text class="note end" x="340" y="24">red for hours to days</text>
<text class="start" x="46" y="92">inner loop · TDD</text>
<text class="note end" x="340" y="92">a minute or two each</text>
<rect class="core" x="52" y="110" width="76" height="24" rx="3"/>
<rect class="core" x="155" y="110" width="76" height="24" rx="3"/>
<rect class="core" x="258" y="110" width="76" height="24" rx="3"/>
<text x="90" y="122">red</text>
<text x="193" y="122">green</text>
<text x="296" y="122">refactor</text>
<path class="wire on" d="M128 122H155" marker-end="url(#loop-tip-on)"/>
<path class="wire on" d="M231 122H258" marker-end="url(#loop-tip-on)"/>
<path class="wire on" d="M296 134V150H90V134" marker-end="url(#loop-tip-on)"/>
<text class="note" x="193" y="165">commit on every green</text>
<text class="start" x="46" y="218">feature done</text>
<text class="note start" x="46" y="235">the acceptance test passes</text>
<text class="note end" x="340" y="218">then the next story</text>
<path class="wire" d="M193 54V76" marker-end="url(#loop-tip)"/>
<path class="wire" d="M193 180V202" marker-end="url(#loop-tip)"/>
<path class="wire on dash" d="M34 225H20V31H34" marker-end="url(#loop-tip-on)"/>
<text class="note on" x="8" y="128" transform="rotate(-90 8 128)">outer loop · ATDD</text>
</svg>
<figcaption>The acceptance test says what done means. The unit tests are how you design your way there, committing on every green.</figcaption>
</figure>

The outer loop is slower, but it answers what the inner loop can't: is it finished? Not when
somebody says so, not when the code looks complete, but when the specification passes. It also
tells you when to stop, before you build more than the story asked for.

Here is the discount again, this time from the customer's side:

```java
class DiscountAcceptanceTest extends DslTestCase {
    @Test
    void shouldChargeDiscountedPriceForLargeOrders() {
        store.addProduct("name: TDD", "price: 120.00");
        customer.addToBasket("name: TDD");
        customer.checkOut();
        customer.assertCharged("amount: 108.00");
    }
}
```

No clicks, no URLs, no JSON. A domain expert can read it, and if checkout moves to a mobile app,
nothing in this file changes. That's down to the four layers Farley builds acceptance tests from,
each with its own reason to change:

1. **Test cases** in the language of the domain. They change when the requirements do.
2. A **domain-specific language**, the `store` and `customer` above, shared by every test case,
   with parameters, aliases and defaults. It changes when the domain's concepts do.
3. **Protocol drivers** that know how to reach the system: a browser driven by Playwright, a REST
   client, a message queue. They change when an interface does.
4. The **system under test**: the release candidate, deployed as it will run in production.

Redesign the checkout page and you update one driver, not hundreds of tests.

Feedback is only worth having if you can trust it, so acceptance tests control their variables.
Each test creates its own data, with names made unique per run (`TDD` becomes `TDD-48213`), so
tests run in parallel on one environment with no cleanup. Payments and email are stubbed at the
system's boundary, and the clock is injectable. No `sleep()`: poll with a timeout. A flaky test is
a bug. Fix it now, or the team learns to ignore red.

## The pipeline closes the loop

Both loops start at the desk. The deployment pipeline runs them again on every commit, against
everybody's work integrated on trunk:

- The **commit stage** compiles, runs the unit tests and static analysis, and builds the artefact
  once, in under five minutes, so you wait for the result before you start something new.
- The **acceptance stage** deploys that same artefact and runs the executable specifications, with
  a definitive answer within the hour.
- **Exploratory testing** looks for the scenarios nobody thought of, without holding up the line.
  Production gets the same artefact, deployed the same way.

A failure anywhere stops the line: fix it within minutes or revert the commit. Whatever gets
through is releasable, so releasing becomes a decision rather than a project.

## Tests that keep the loops fast

A loop only works while it stays fast. Once the commit stage takes twenty minutes, people stop
waiting for it and batch up their changes, and the feedback arrives too late to act on. The shape
of the tests decides the speed:

- **The domain core gets the bulk of the tests**: unit tests that run in milliseconds, in the commit
  stage.
- **Adapters get a handful of integration tests** against real infrastructure, with Testcontainers
  rather than mocks of the database.
- **The deployed system gets the acceptance specifications**, in the acceptance stage.

A codebase where every test needs a Spring context or a database can't have a five-minute commit
stage, however clever the build server. Writing the test first keeps you out of that corner: you
feel a heavy setup before the code exists, so the logic ends up in plain code with the
infrastructure behind an interface.

Each loop catches what the faster one can't, and every one of them depends on the change being
small:

| Loop             | Question it answers                 | Answer in       |
|------------------|-------------------------------------|-----------------|
| Pairing          | Is this line right?                 | seconds         |
| TDD              | Does this code do what I meant?     | a minute or two |
| Commit stage     | Did this change break anything?     | under 5 minutes |
| Acceptance stage | Does the system do what users need? | under an hour   |
| Production       | Did it help the users?              | days            |

The fastest, pairing, closes before the commit and has
[a post of its own](/blog/pairing-the-pull-request-reviewed-in-real-time/).

## Small steps, fast feedback

Speed and quality are usually sold as a trade-off. In *Modern Software Engineering*, discussing the
research behind *Accelerate*, Farley calls that belief simply not true and sums up why:

> The route to speed is high-quality software, the route to high-quality software is speed of feedback, and the route to
> both is great engineering.

None of this needs a big-bang transformation. Write a failing test before the next bug fix. On
legacy code, which is code without tests, don't retrofit unit tests that lock in today's design:
pin today's behaviour with approval and acceptance tests, refactor in small steps under that net,
and test-drive every new line. Write the next story's acceptance test before its code. The test
comes first; the design follows.

If you want help shortening the loop in your team, [get in touch](/#contact).
