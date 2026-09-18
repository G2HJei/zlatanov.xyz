---
title: Bringing a legacy order system under test
client: Illustrative sample
period: 2025
stack: [Java 21, Spring Boot, Testcontainers, ArchUnit, GitHub Actions]
summary: A ten-year-old order management monolith that nobody dared to change became something the team could release every week.
outcome: Release cadence went from quarterly to weekly, with no production rollbacks in the following six months.
order: 1
draft: true
---

> This is an illustrative sample kept as a draft so it only shows up in `astro dev`.
> Replace it with a real engagement and set `draft: false`.

## Context

An order management system built over a decade, with a large shared database, sparse tests and a
quarterly release train that regularly slipped. The team knew the code well but every change
carried the risk of breaking something in a distant module.

## Approach

We started with characterisation tests around the most-changed areas, using Testcontainers so the
tests ran against a real database. ArchUnit rules made the intended module boundaries explicit and
failed the build when they were crossed. With a safety net in place we extracted the pricing rules
into a dedicated domain module, driven by tests, and moved the pipeline to trunk-based delivery
with automated smoke tests on every merge.

## Result

Within four months the team released weekly, and later on demand. The pricing module became the
template for further extractions the team carried out on their own.
