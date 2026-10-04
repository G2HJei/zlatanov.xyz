---
title: 'Pairing: The Pull Request, Reviewed in Real Time'
description: Pull request reviews add days of waiting and catch less than they promise. Pair programming, with a colleague or an AI assistant, reviews the code while it is being written, so every commit can go straight to trunk.
date: 2026-10-04
tags: [ article ]
draft: false
---

The tightest feedback loop in software development closes before the commit. In
[Fast Development Cycles Made Simple](/blog/fast-development-cycles-made-simple/) I walked through
the loops that tell a team whether a change is any good: TDD in a minute or two, the commit stage in
under five minutes, the acceptance stage within the hour. Pairing answers a smaller question faster
than any of them. *Is this line right?* It answers in seconds, while the line is still being typed.

Most teams answer that question somewhere else entirely: in a pull request, days later.

## What a pull request review costs

The routine is familiar. Write the change, open the request, wait for a reviewer to have time,
answer the comments, wait again. Each round trip adds hours or days to a change the pipeline could
judge in minutes. Nobody sits idle while they wait, and that's part of the cost: the author starts
something else, the reviewer is pulled out of their own work to read code they haven't seen, and by
the time the comments arrive, both of them have to reload the context they put down.

The wait quietly pushes the team back towards long-lived branches. If every merge costs a review
round, people merge less often to pay the cost less often, so each request grows, so it takes longer
to review, so people merge even less often. It's the spiral of infrequent releases one level down,
and it ends in the big batch that continuous integration exists to avoid.

It doesn't even buy that much quality: ten changed lines get ten comments, five hundred get "looks
good to me". The reviewer sees the result, not the reasoning, and arrives after the decisions that
matter have been made. Questioning the design of a finished change means redoing it, so the comments
settle on names and formatting, and the design goes through as it is.

None of this makes the pull request a bad tool. It was made for open source, where maintainers
review contributions from people they have never met and can't let push to the main branch. Inside
a team that works together every day, the same gate treats colleagues like strangers.

## Review, taken to its logical end

Kent Beck took the idea of review to its logical end in the first edition of *Extreme Programming
Explained*:

> If code reviews are good, we'll review code all the time (pair programming).

Pairing is the pull request review, happening while the code is written. One person drives, the
other navigates, and they swap often. The navigator catches the misleading name, the missing test
or the unhandled edge case while fixing it costs seconds, not another review round. And because the
navigator is there before the design is settled rather than after, the review can still change the
design, which is the part a pull request rarely reaches.

By the time the commit reaches trunk, two people understand it and it has already been reviewed, so
it can go straight into the pipeline. In his post on
[continuous integration and feature branching](https://www.davefarley.net/?p=247), Dave Farley,
co-author of *Continuous Delivery*, answers the inevitable "but how do you do code reviews?" in two
sentences: "Pair Programming is my preferred approach. You get better code reviews and much more."
In the same post he describes committing every fifteen minutes or so when he's working well. No
review queue keeps up with that pace, and a pair doesn't need one.

The "much more" is worth spelling out. Every part of the code is known to at least two people, so
nobody becomes the bottleneck and nobody's holiday holds up a release. A newcomer learns the
codebase, the domain and the team's habits by working in them, not by reading about them. And a
pair stays on task: it's much harder to drift into email or down a rabbit hole with somebody next to
you.

## How a pair works

Birgitta Böckeler and Nina Siessegger's
[On Pair Programming](https://martinfowler.com/articles/on-pair-programming.html) is the most
thorough practical guide I know of. It describes three styles, and each has its place:

- **Driver and navigator.** The driver types and talks through what they're doing; the navigator
  keeps the bigger picture: the next test, the design, what's been missed. Swap the keyboard often,
  so both of you do both jobs.
- **Ping-pong.** Pairing and TDD in one rhythm. One of you writes a failing test, the other makes it
  pass and writes the next failing test, and you refactor together while everything is green.
  Nobody writes code that no test asked for, and the tests get written because the game can't move
  on without them.
- **Strong-style.** Every idea goes from the navigator's head into the computer through the driver's
  hands. It's a good way to bring someone new on board: the newcomer types, the experienced
  developer explains what to do and why. Used all the time, it turns into micro-management, so keep
  it for passing knowledge on.

A few habits make it last:

- **Not all day.** Pairing is intense. The same guide suggests six hours a day at most, with real
  breaks; a timer helps both of you notice when it's time to stop.
- **Rotate the pairs.** Change partners every few days, so knowledge spreads across the team rather
  than between the same two people.
- **Remote works too.** Screen sharing where both people can take control and good audio are the
  minimum; a shared editing session in the IDE is better still.
- **Pair by default, review the exceptions.** Not every change gets paired: the urgent fix in the
  evening, the week half the team is off. Böckeler and Siessegger describe teams that pair by
  default and fall back to a pull request only for production code somebody changed alone. The
  review becomes the exception it should be, not the queue every change waits in.

## "Two people, one keyboard, half the output"

The objection every team raises first is arithmetic: two developers on one task must cost double.
It would, if typing were the bottleneck. It never is. The time goes into understanding the problem,
choosing a design, finding the bug, and waiting: for a review, for an answer, for the one person
who knows that part of the system.

The research that exists points the same way. In
[The Costs and Benefits of Pair Programming](https://www.semanticscholar.org/paper/The-costs-and-benefits-of-pair-programming-Cockburn-Williams/5ff7b75b20fdbfae23587b660b7093aec2f48e69),
Alistair Cockburn and Laurie Williams report, from interviews and a controlled experiment with
students at the University of Utah, that pairing cost about 15% more development time and in return
improved design quality and reduced defects. Students on short assignments aren't a professional
team, so take it as a direction rather than proof. But notice what the comparison leaves out: the
solo developer's change still needs a reviewer. With a pull request, two people spend time on the
change as well, only later, one after the other, with a wait in between.

A pair finishes with a reviewed change, ready for trunk. A developer working alone finishes with a
change that's waiting.

## Pairing with an AI

The pair doesn't have to be a person any more. An AI assistant makes a patient navigator: it reads
every line as you write it, suggests the next test case, spots the null you didn't handle and
explains code you haven't seen before. Swap roles and let it drive, and you become the reviewer,
reading each small step as it lands instead of a 600-line diff at the end.

TDD keeps the AI pair honest. You write the failing test that states what you want, the assistant
proposes code to pass it, and the test decides whether the proposal is right, not the confidence of
its explanation. It's ping-pong where you always serve: every test is yours, so what the code is
supposed to do stays your decision. Then the pipeline judges the result exactly as it judges your
own code. Two rules keep it safe: you own every line that ships, so nothing goes in that you can't
explain, and the AI's code meets the same bar as anybody else's. Tests first, small commits, through
the pipeline, no exceptions.

A colleague still brings what an assistant can't: knowledge of the business and its history, a
stake in the outcome, and a team where knowledge spreads instead of staying in one head. Pair with
a person when the problem is new or hard, and with an AI when you need a second pair of eyes on the
everyday work. Either way, the review happens while the code is written.

## Where to start

You don't need a policy to try it. Pick the next hard ticket or the next bug nobody wants, book two
hours with a colleague, and swap the keyboard at every green test. If the team requires a pull
request for every change, agree to skip it for paired work and keep it for the exceptions. Then
compare how long a change takes from first commit to production, before and after.

If you want help bringing pairing and trunk-based development into your team,
[get in touch](/#contact).
