# breathe

A relaxing breathing guide for Claude Code. Type `/breathe` to open a side pane with a soft circle that grows as you breathe in, holds, and shrinks as you breathe out, with a countdown and a gentle cue for each phase. Type `/breathe` again to close it.

In the pane:

- `p` pauses or resumes
- `n` switches pattern: Calm 4·6, Box 4·4·4·4, Relax 4·7·8
- `x` closes the pane

It counts the breaths you finish in each session, and picking a new pattern starts the count again.

## What it does and doesn't do

The mod draws one pane and adds the `/breathe` command. That's all. It sends nothing over the network, reads and writes no files, runs no programs, and collects no data. Your progress through a pattern is kept only in the current Claude Code session.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install breathe --marketplace CHREGGIE/breathe
```

Answer `y` to add the marketplace, then press Enter to pick the user scope.

From a shell:

```
claude plugin install breathe --marketplace CHREGGIE/breathe
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `CHREGGIE/breathe`, then Add plugin.
