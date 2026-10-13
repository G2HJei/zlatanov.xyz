---
title: 'My Job Search Outgrew a Spreadsheet...'
description: A small, free tool I built with the help of Claude to keep a job search in order. Applications, contacts, interviews and next steps in your browser, with your data on your own machine.
date: 2026-10-13
tags: [ article ]
draft: false
---

A job search is a project with a lot of moving parts and no project manager. Ten applications in,
you are juggling recruiters' names, interview slots, salary ranges, a take-home due on Thursday, and
a company you meant to chase a week ago. Most people end up with a spreadsheet, a pile of browser
tabs and a calendar that knows about half of it.

[Jedediah](https://github.com/G2HJei/jedediah) is my answer to that: a free, light tool that runs on
your own computer and that you use in the browser. It keeps track of where you applied, who you
talked to, which interviews are coming up, and what to do next and when.

I've been tinkering with Go for a while, but also wanted to field test Claude's Opus 5.5, so I created Jedediah in
collaboration with Claude. Gen AI heavy development in enterprise context can be risky, but it really shines when
building such light tools for personal use while learning new technology.

## What it does

The dashboard opens on what needs you today: overdue actions, applications waiting for a follow-up,
the pipeline by status, and everything coming up in the next two weeks.

![Jedediah's dashboard: overdue actions, follow-ups, the pipeline and the next two weeks](https://raw.githubusercontent.com/G2HJei/jedediah/master/docs/screenshots/overview.png)

Behind it:

- **Applications**: every application in one table you can filter, sort, and search.
- **One page per application**: company, contacts, the posting, the hiring process, interviews,
  questions and answers, compensation, and notes, with the key dates and the next step at the top.
  Click any field to edit it.
- **Board**: drag an application from one status to the next.
- **The rest**: a calendar with an `.ics` export for Outlook or Google Calendar, a CV library, a CSV
  export, and a ZIP backup.

![The board: applications grouped by status, each with its next step, priority and date](https://raw.githubusercontent.com/G2HJei/jedediah/master/docs/screenshots/board.png)

## Your data stays yours

There is no account and no cloud, and it works offline. Your data stays on your machine as plain
YAML files you can read and back up like any other folder. A job search is personal: salaries, the
names of the people you talk to, notes on the interview that went badly. None of that should need a
sign-up form.

Jedediah is open source under GPL-3.0. Check the latest release over at [Github](https://github.com/G2HJei/jedediah).
