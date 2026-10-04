---
title: Fast Development Cycles Made Simple
description: Continuous delivery as Dave Farley describes it, shown on a real project. A deployment pipeline that judges every commit, and TDD that leaves good design behind as a side effect.
date: 2026-10-04
tags: [ article, ci/cd, tdd, architecture, java ]
draft: true
---

What do the teams that ship well have in common? Not a framework, not a cloud provider, not a
methodology with a capital letter. Ask them how long a one-line change takes to reach production
and they answer in minutes or hours. Ask a struggling team and they answer with a calendar: the end
of the sprint, the next release train, after the change advisory board meets.

The difference is rarely talent, and never typing speed. It's how quickly a team finds out whether
a change is any good, and how little it costs them to act on the answer.

Jez Humble and Dave Farley open the first chapter of *Continuous Delivery*, the 2010 book that put
the practice on the map, with the question underneath all of this:

> The most important problem that we face as software professionals is this: If somebody thinks of a good idea, how do we deliver it to users as quickly as possible?

This post walks through Farley's answer: the deployment pipeline, the tests that make it
trustworthy, and the design that falls out of writing those tests first. They look like three
practices. They are one system, and each part only works because of the others.

To keep it concrete, the examples come from [subsbuddy](https://github.com/G2HJei/subsbuddy), a
hobby project of mine that translates English `.srt` subtitles into Bulgarian through the DeepL API.
I built it as the practical exercise for Dave Farley's CI/CD course, so it puts his recommendations
to work on a small scale.

## Engineering is learning, so shorten the loop

Farley's later book, *Modern Software Engineering*, starts from a definition:

> Software engineering is the application of an empirical, scientific approach to finding efficient, economic solutions to practical problems in software.

The word that matters is *empirical*. Nobody knows in advance whether a change works, whether users
want it, or whether it breaks something three modules away. We find out by trying it and looking at
the result, so a team learns exactly as fast as its feedback loops allow, and no faster.

Farley splits the job into two halves. We need to be experts at **learning**: working iteratively,
in small increments, guided by feedback and experiments. And we need to be experts at **managing
complexity**: modularity, cohesion, separation of concerns, information hiding and abstraction, and
loose coupling. Keep that second list in mind; it comes back when we get to TDD.

Big batches make the loop long. A quarter's worth of changes released together fails in ways
nobody can untangle, so releases get scarier, so they happen less often, so the batches grow. One
of the principles in *Continuous Delivery* breaks that spiral, and it sounds backwards the first
time you hear it:

> If it hurts, do it more frequently, and bring the pain forward.

Release once a month and every release is an event. Release several times a day and it's a
non-event, because each change is small enough to understand, to test, and to roll back if it comes
to that.

The point isn't to deploy all the time, it's to be able to. Farley's short definition of continuous
delivery is working so that the software is always in a releasable state. Whether every green
build then goes live by itself (continuous deployment) or waits for somebody to press a button is a
separate decision, and an easy one once releasing is boring.

## Continuous integration means trunk, every day

Continuous delivery is built on continuous integration, and Farley is strict about what the term
means: everybody merges their work into trunk at least once a day, and an automated build tells
them within minutes whether the result still works. A CI server building a feature branch that
lives for two weeks isn't continuous integration. It's a fast build of code that hasn't been
integrated with anything.

The reason is arithmetic. Every day a branch stays open it drifts further from everybody else's
work, and the merge at the end is a big batch again, carrying all the risk the rest of the process
exists to avoid. Unfinished features don't need a branch to hide in. They need ways to ship
incomplete code safely: a feature flag, branch by abstraction, or simply building the back end
before the button that exposes it. Subsbuddy's history shows what that looks like: one straight
line of nearly 200 commits on `master`, without a single merge.

Committing small changes to trunk all day only works if you can trust the build that judges them.
That build is the deployment pipeline.

## The deployment pipeline

*Continuous Delivery* defines it like this:

> At an abstract level, a deployment pipeline is an automated manifestation of your process for getting software from version control into the hands of your users.

Every step between a commit and production lives in it: compiling, testing, packaging, deploying,
checking. Farley frames it as an experiment. Every commit gives birth to a release candidate, and
the pipeline's job is to
["prove that a Release Candidate is NOT fit to make it into production"](https://www.davefarley.net/?p=247).
Every test, from unit to security, is a falsification mechanism. A candidate that survives every
attempt to reject it is releasable; the first failure ends the experiment and sends the result
straight back to whoever made the change.

<figure class="diagram" data-title="deployment pipeline">
<svg viewBox="0 0 360 266" role="img" aria-label="A small commit to trunk enters the commit stage, which compiles, runs the unit tests and builds the artefact a1b2c3 once, in under five minutes. The same artefact moves on to the acceptance stage, which deploys it and runs the executable specifications within the hour, and then to production, where it can go at any time. Every stage sends feedback straight back to the commit.">
<defs><marker id="pipe-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip" d="M0 0L10 5L0 10z"/></marker><marker id="pipe-tip-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path class="tip on" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="box" x="34" y="8" width="318" height="46" rx="4"/>
<rect class="box" x="34" y="76" width="318" height="46" rx="4"/>
<rect class="box" x="34" y="144" width="318" height="46" rx="4"/>
<rect class="box" x="34" y="212" width="318" height="46" rx="4"/>
<text class="start" x="46" y="24">commit</text>
<text class="start" x="46" y="92">commit stage</text>
<text class="start" x="46" y="160">acceptance stage</text>
<text class="start" x="46" y="228">production</text>
<text class="note start" x="46" y="41">small change, straight to trunk</text>
<text class="note start" x="46" y="109">compile, unit tests, build once</text>
<text class="note start" x="46" y="177">deploy, run executable specs</text>
<text class="note start" x="46" y="245">same artefact, same deploy</text>
<text class="note end" x="272" y="24">at least daily</text>
<text class="note end" x="272" y="92">&lt; 5 min</text>
<text class="note end" x="272" y="160">&lt; 1 hour</text>
<text class="note end" x="272" y="228">any time</text>
<rect class="core" x="284" y="89" width="56" height="20" rx="3"/>
<rect class="core" x="284" y="157" width="56" height="20" rx="3"/>
<rect class="core" x="284" y="225" width="56" height="20" rx="3"/>
<text x="312" y="99">a1b2c3</text>
<text x="312" y="167">a1b2c3</text>
<text x="312" y="235">a1b2c3</text>
<path class="wire" d="M312 54V76" marker-end="url(#pipe-tip)"/>
<path class="wire" d="M312 122V144" marker-end="url(#pipe-tip)"/>
<path class="wire" d="M312 190V212" marker-end="url(#pipe-tip)"/>
<text class="note end" x="302" y="65">every commit</text>
<text class="note end" x="302" y="133">release candidate</text>
<text class="note end" x="302" y="201">releasable</text>
<path class="wire on dash" d="M34 235H20V31H34" marker-end="url(#pipe-tip-on)"/>
<path class="wire on dash" d="M34 99H20M34 167H20"/>
<text class="note on" x="8" y="133" transform="rotate(-90 8 133)">feedback</text>
</svg>
<figcaption>Every commit is a release candidate. The commit stage builds the artefact once, every later stage tests that same artefact, and any failure goes straight back to whoever made the change.</figcaption>
</figure>

The practices that make it work:

- **Every commit is a release candidate.** There is no release branch and no stabilisation sprint.
  Whatever the pipeline accepts is ready to go.
- **Fast feedback first.** The commit stage compiles the code, runs the unit tests and the cheap
  checks (static analysis, architecture rules) and builds the artefact, ideally in under five
  minutes, so you wait for the result before you start something new. The slower evaluations come
  after it, against the artefact it produced: acceptance tests, then performance and security.
  Aim for a definitive answer within an hour.
- **Build the artefact once.** The JAR or image built in the commit stage is the one every later
  stage deploys, identified by its version. Rebuild it for production and you release something
  you never tested.
- **Deploy the same way everywhere.** The acceptance environment and production use the same
  deployment mechanism; only the configuration differs. By the time it matters, the deployment
  itself has been exercised hundreds of times.
- **Stop the line.** A failed stage is the team's top priority: fix it within minutes or revert the
  commit. A pipeline that stays red teaches everybody to ignore it.
- **The pipeline is the only way to production.** No hotfix edited on the server, no manual step in
  a runbook. Application code, pipeline definition, infrastructure and database migrations all
  live in version control and take the same route.
- **Green means releasable.** If the pipeline passes, the change can go live with no further work:
  no manual regression phase, no sign-off meeting. If the team doesn't trust a green build, the
  pipeline is missing tests, and the fix is to add them, not another manual gate.

### Subsbuddy's pipeline

Subsbuddy's pipeline is a single GitHub Actions workflow with its stages marked out in comments.
Abridged, without the checkout, the JDK set-up, the Docker Hub login, the details of the SSH command
and a clean-up step, it looks like this:

```yaml
on:
  push:
    branches: [ "master" ]

env:
  BUILD_NUMBER: RC.${{ github.run_id }}.${{ github.run_number }}

jobs:
  Build-RC:
    runs-on: ubuntu-latest

    steps:
      # COMMIT STAGE
      ##############
      - name: Commit Stage Tests + Package
        run: mvn -B package

      # ACCEPTANCE STAGE
      ##################
      - name: DockerHub > push (${{ env.BUILD_NUMBER }})
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/subs-buddy:${{ env.BUILD_NUMBER }}

      - name: Deploy @ TEST
        run: >
          sshpass ... ssh ... root@${{ secrets.VPS_IP }} "
          docker pull ${{ secrets.DOCKER_USERNAME }}/subs-buddy:${{ env.BUILD_NUMBER }};
          docker run -d -p 8080:8080 --name subs-buddy ... \
            ${{ secrets.DOCKER_USERNAME }}/subs-buddy:${{ env.BUILD_NUMBER }}
          "

      - name: Acceptance Tests
        run: echo "Acceptance stage tests would normally be executed here."

      # DEPLOY STAGE
      ##############
      - name: DockerHub > promote to RC
        run: |
          docker tag ${{ secrets.DOCKER_USERNAME }}/subs-buddy:${{ env.BUILD_NUMBER }} \
                     ${{ secrets.DOCKER_USERNAME }}/subs-buddy:rc
          docker push ${{ secrets.DOCKER_USERNAME }}/subs-buddy:rc
```

Mapped onto the practices above:

- **Every push to trunk is a release candidate.** The workflow runs on every push to `master` and
  names the result `RC.<run id>.<run number>` before the first step starts.
- **The commit stage is one command.** `mvn -B package` compiles all three modules, runs every test
  and packages the JARs.
- **The artefact is built once.** The Dockerfile compiles nothing: it copies `subs-buddy-web.jar`,
  the JAR the commit stage has just tested, onto a Java base image. The test server pulls and runs
  that exact tag.
- **Promotion is a new tag, not a new build.** When every step has passed, the same image is tagged
  `rc`, ready for production.
- **It's quick.** A green run takes about a minute from push to release candidate.

The excerpt shows its gap too: the acceptance stage deploys to the test server, but the step that
should test that deployment is still an `echo`. A pipeline is never finished. It grows with the
system, and the next section is about what belongs in that step.

## Acceptance tests are executable specifications

Unit tests tell developers that the code does what they meant. Acceptance tests tell everybody
that the system does what its users need, and Farley is particular about how to write them:
describe *what* the system does, in the language of the problem domain, never *how* it does it. He
builds them in four layers:

1. **Test cases** read like specifications, in the words the business uses.
2. A **domain-specific language** turns those words into actions on the system.
3. **Protocol drivers** translate the actions into HTTP calls, browser clicks, messages or
   commands.
4. The **system under test**, deployed as it will run in production.

Subsbuddy's acceptance tests for its command-line app have the same layers in miniature:

```java
@Test
void shouldTranslateSingleFile() {
  setupInputFile();
  executeCommand("translate", "--input", unixPath(given), "--output", unixPath(actual));
  assertTranslation(givenLine1.toUpperCase(), actual);
}
```

The test case is the three lines of the method, and `setupInputFile`, `executeCommand` and
`assertTranslation` are its small language. Spring Shell's `ShellTestClient` is the protocol driver:
it runs the real `translate` command, options and all, the way a user would type it. The system
under test is the whole application with one substitution: a test configuration swaps DeepL for a
fake connector that "translates" by upper-casing, which is why the expected output is the input in
capitals. Fake the systems you don't own at the edge of yours. The tests then check your system,
and they don't fail because a third-party service is having a bad day.

That test still runs in-process, in the commit stage. Specifications in the same style, driving the
web app on the test server over HTTP, are what the `echo` in the pipeline is waiting for.

Write the specification before the feature, and it doubles as the definition of done: the feature
is finished when its specification passes in the pipeline, not when somebody says so.

## TDD: fast tests and good design from one habit

The commit stage can only answer in minutes if most of the testing happens in unit tests that run
in milliseconds. Test-driven development is how you get them without a separate testing effort.
Red: write a failing test for the next small piece of behaviour. Green: make it pass with the
simplest code that works. Refactor: clean up while the tests keep you safe. A minute or two per
cycle, all day long.

Here is the point most teams miss, in [Farley's words](https://www.davefarley.net/?p=220):

> Test Driven Development is only partially about testing, of much greater importance is its impact on design.

The test is the first user of the code. If the code is awkward to use from a test, it will be
awkward to use from everywhere else, and TDD tells you before you've built it rather than after.

The hard part of subsbuddy isn't calling DeepL. It's that subtitles cut sentences into pieces.
Send *To be the man you've got to* and *beat the man.* as two separate lines and DeepL translates
two fragments, and the Bulgarian comes back mangled. The translator has to join entries into whole
sentences, translate those, and spread the result back over the original time slots. Those rules
live in the tests as named cases, one per situation the translator has to handle:

```java
@ParameterizedTest
@MethodSource("subsEntriesArgs")
void shouldTranslate(List<SubtitleEntry> givenEntries, List<SubtitleEntry> expectedEntries) {
  val actualEntries = translator.translate(givenEntries);
  assertEquals(expectedEntries, actualEntries);
}

static Stream<Arguments> subsEntriesArgs() {
  return Stream.of(
      // ...
      argumentSet("Two-entry sentence",
          entries("0 -> 1 To be the man you've got to",
              "1 -> 2 beat the man. If you smell..."),
          entries("0 -> 1 TO BE THE MAN YOU'VE GOT TO",
              "1 -> 2 BEAT THE MAN. IF YOU SMELL...")),

      argumentSet("Tri-line sentence",
          entries("0 -> 1 To be the man",
              "1 -> 2 you've got to",
              "2 -> 3 beat the man."),
          entries("0 -> 1 TO BE THE MAN YOU'VE",
              "1 -> 2 GOT TO BEAT THE",
              "2 -> 3 MAN.")),
      // ...
  );
}
```

Each string is a time slot in seconds followed by its text, and the `entries` helper turns them
into subtitle entries, so every case reads like a small table of input and expected output.

Why the capitals? The translator never talks to DeepL directly. It talks to a port, the
`TranslationConnector` interface, and the tests plug in a fake that translates by shouting:

```java
public class CapitalizingTranslationConnector implements TranslationConnector {

  @Override
  public long usagePercent() {
    return -1;
  }

  @Override
  public String translate(String text, Language from, Language to, String context) {
    return text.toUpperCase();
  }
}
```

Upper-casing keeps every word where you can find it, so the expected output shows exactly how a
translated sentence is spread back over the time slots. In the tri-line case the line breaks move,
because the translation is laid out again over the slots instead of being mapped line by line. And
when the question is what DeepL receives, a Mockito spy on the same fake checks that two entries
arrive as one sentence: *To be the man you've got to beat the man.* None of these tests starts
Spring, opens a database or touches the network.

The fake is just another adapter. That's the
[hexagonal architecture](/blog/architecture-styles-and-when-not-to-use-them/#hexagonal-ports-and-adapters)
from my post on architecture styles, reached from the test side instead of drawn on a whiteboard
first. Apply the same pressure across a whole codebase and Farley's tools for managing complexity
show up uninvited. In subsbuddy:

- **Modularity.** The translation logic is a plain Java module with no Spring in it. The web app and
  the command-line app each wire it up in about ten lines of configuration, and the commit that
  added the command-line app didn't change a line of the core's production code.
- **Cohesion.** `SubsBuddyClient.translateSrt` reads like the job itself: parse the entries, fix
  typos, translate, assemble the file. Each step is its own class with its own tests.
- **Separation of concerns.** The core doesn't know whether it serves a web page or a terminal. When
  the command-line app wanted a progress bar, the core didn't start logging; it got a
  `TranslationProgressLogger` port, a no-op default and a test.
- **Information hiding and abstraction.** The grouping and redistribution logic lives in internal
  classes with no tests of their own. The tests check what the translator does, not how, so its
  insides can change freely: the parser and the assembler were both restructured on the same day
  without touching a single test, and the pipeline stayed green.
- **Loose coupling.** The only way out to DeepL is the `TranslationConnector` port, passed in
  through a constructor.

None of those were the goal. They are side effects of making the code easy to test. In the post
quoted above, Farley lists what makes code testable (modular, loosely coupled, cohesive, with good
separation of concerns and information hiding) and adds: "Precisely the same properties as those
of high quality code." Hard-to-test code is the design telling you something; TDD makes you listen
while the fix is still cheap. The commit stage then runs those tests on every push, and the loop
closes.

## Architecture that keeps the pipeline fast

The pipeline and the architecture shape each other, and the consequences are practical:

- **Tests follow the structure.** The domain core gets the bulk of the tests, in milliseconds, in
  the commit stage. Adapters get a handful of integration tests against real infrastructure, with
  Testcontainers rather than mocks of the database. The deployed system gets the acceptance
  specifications. A codebase where every test needs a Spring context or a database can't have a
  five-minute commit stage, however clever the build server.
- **The commit stage enforces the boundaries.** Module rules written as tests, with ArchUnit or
  Spring Modulith, fail the build when somebody takes a shortcut across a boundary. Separate Maven
  modules do the same at compile time, which is why subsbuddy's core can't reach for Spring: it
  isn't on the classpath. A rule on a wiki page decays; a rule in the pipeline holds.
- **One pipeline per independently deployable unit.** The scope of a pipeline is something you can
  release on its own. If two services have to be tested together before either can be released,
  they are one deployable in disguise and belong in one pipeline. Keep them truly independent with
  contract tests at the boundary, so each side's pipeline checks its half of the contract.
- **Every change has to be deployable on its own.** With small, frequent releases, the old and the
  new version run side by side during a rollout. Database migrations go expand, migrate, contract;
  APIs add before they remove.

## Cheat sheet

| Loop             | Question it answers                 | Answer in       |
|------------------|-------------------------------------|-----------------|
| Pairing          | Is this line right?                 | seconds         |
| TDD              | Does this code do what I meant?     | a minute or two |
| Commit stage     | Did this change break anything?     | under 5 minutes |
| Acceptance stage | Does the system do what users need? | under an hour   |
| Production       | Did it help the users?              | days            |

Each loop catches what the faster one can't, and every one of them depends on the change being
small. The fastest, pairing, closes before the commit and has
[a post of its own](/blog/pairing-the-pull-request-reviewed-in-real-time/).

## Small iterations

Speed and quality are usually sold as a trade-off. In *Modern Software Engineering*, discussing the
research behind *Accelerate*, Farley calls that belief simply not true and sums up why:

> The route to speed is high-quality software, the route to high-quality software is speed of feedback, and the route to both is great engineering.

Strip it down and fast development cycles come from one formula:

**CI/CD + unit and acceptance tests + design by contract = small iterations**

The pipeline is the only route to production and judges every commit. Unit tests keep the commit
stage fast and the design clean; acceptance tests define what done means. Design by contract runs
through all of it: every unit, module and service has an explicit contract, what it needs and what
it promises, written down as tests that the pipeline checks on every change. What comes out is
small iterations, and with them the fast, safe cycles that the teams that ship well have in common.

None of this needs a big-bang transformation. Bring the pain forward where it hurts most: write the
first test before the next bug fix, make the build fail on a broken test, merge to trunk tomorrow
instead of next week.

If you want help shortening the loop in your team, [get in touch](/#contact).
