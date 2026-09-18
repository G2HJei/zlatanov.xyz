---
title: Post Title
description: One or two sentences shown in lists, search results and social previews.
date: 2026-09-02
# updated: 2026-09-10
tags: [article, java, spring, tdd, ci/cd]
# author: Boyan Zlatanov          # defaults to the site owner
# cover: /images/post-cover.png   # optional, used as the social preview image
draft: true
---

## Heading

Body text with `inline code`, a [link](https://zlatanov.xyz/) and a fenced block:

```java
@Test
void rejectsEmptyOrders() {
    assertThatThrownBy(() -> new Order(List.of()))
        .isInstanceOf(IllegalArgumentException.class);
}
```

Copy this file to `<slug>.md` (the filename becomes the URL) and set `draft: false` to publish.
