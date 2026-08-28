---
title: Theory of Telos
date: 2026-08-27
excerpt: Serious delegation requires more than task competence. An agent must understand why the system under its care exists, what must be preserved, and where it is going.
tags: agents, competence, responsibility, telos, software-engineering
status: evergreen
category: personal
layout: essay
---

So every few weeks I open Twitter and see someone make a post that software engineering is solved, coding is solved. Someone says that models have become better at software engineering, and the reason for such tweets is typically that now they can solve more programming problems, close more benchmark issues, or one-shot tasks that previously took several attempts.

Now these are real capabilities, but they are also really weak evidence for the claim that you make. And your claim is that software engineering is done, like coding is done.

And I would like to understand one thing here: is a person who can solve difficult programming problems all that it takes to give an important system and say, take care of this? Or does it require something else?

And if we say that it requires something else, then what exactly is it?

In all the competent engineers that I've worked with, this has been one central quality that they have: a need to understand what the system is for. They have a need to know which parts are essential, which might be accidental, which are genuinely ugly because nobody had the time to clean them up, and this gives them the understanding of exactly what can change, what must not change, and what depends on anything that we are doing.

And something might just be scaffolding for future work, where we're heading towards, right?

I would like to call this thing theory of telos, and this is how we are going to refer to it throughout this article.

This particular article is not specifically about software, but software is one of the easiest places to spot this, and this is where we will be leading with examples.

## The Junior Engineer Problem

Years ago, when some junior engineers used to join the team, there was a predictable pattern. They would be shown one module or some section that they were asked to work on, and then what would happen is that they would quickly discover something which they would call incredibly stupid.

And it could be something genuine. It could be a bad abstraction, duplicate logic, some state present in the wrong place, some branch created unnecessarily or for the oddest of purposes, right?

And some of those junior engineers may even take one step ahead and then fix it.

So the problem with such an effort to “fix” things is that they acted on this particular information without exactly knowing why that thing existed in the first place or what purpose it may be serving later on.

They may not know that the duplication supported two slightly different features which were added at the last minute because of some customer escalation issues, because of some report which came due to public security coverage, or it could be something which was decided way late in the software lifecycle because of whatever reason, right?

And they may not know that this particular weird state exists because something happened five to six months ago and the pace of everything has been such that there was no way for anyone to get back to it.

Now I'm not saying that all ugliness is just variants of this. Some ugliness is obviously really bad code. I personally hate such things with as much passion as others.

But I personally think that it is quite easy to get enraged at something without understanding anything about it.

## Reconstructing the Theory Before Acting

I really vouch for something else, and that is essentially developing a theory of telos.

If a competent engineer is put in the same situation, then how would they behave?

Their first instinct may be to reconstruct some sort of model or understanding around that object.

Why does this thing exist? Who depends on it? If I change it, is something going to break? Is this basically some sort of fundamental assumption which needs to stay here so that something else can work?

Which particular pieces are purely historical or legacy? I myself am a new person on this team and was not part of all the discussions and decisions that have been taken in the past. What exactly might this particular team be trying to build towards?

So this specific piece is something which is beyond being able to code in a particular language or being able to, let's say, recreate a particular program from scratch or any of those things.

It's not about memorization here. It's not even about code understanding, actually.

It's something one layer of abstraction above this.

It's a reconstruction of the theory of what this thing exists for right now, and where exactly it is going.

## Not Every Knob Needs to Be Cranked to 11

And once you notice these things, once you start making this a habit of how you really approach something, then you'll start finding that a lot of engineering advice, lots of books that exist on how to manage such and such thing better or how to take decisions about X, Y, Z, or about good programming practices or principles, starts looking quite one-dimensional in nature.

Because there is something fundamental here which is to be understood.

With a very limited view of the system, when we are quite new and aren't really exposed to lots of things, we are prone to looking at something like a lever or a knob, right?

So whichever education culture you may be part of, wherever you're coming from, let's say that you're part of some group that codes and exercises language and you work on some small project or something.

And there is a notion that this particular knob always needs to be set a certain way. So then you go someplace else, notice that knob, and think that this particular knob should be cranked to 11, right?

And if I was to give an example of what such a thing looks like:

Cleaner code is better. Lower latency is better. Always focus on higher recall. Never do something twice. Everything needs to be highly composable. Everything needs to be 100% fragmented, repeatable, recyclable, whatever you want to say, right?

But the thing is that all of that is essentially a sign of not really caring about the core problem you're trying to solve or trying to understand exactly what the thing is for, while being blind to all the other factors that exist.

And real systems are typically a harmony between lots of objects.

So when we're improving something, it has to happen with some sort of awareness about what all things might regress.

That's what I personally call competence in being able to assume a role.

## Zooming Out of Software

Now let's zoom out of this thing entirely and talk about something else where we do not say that something is software.

We take an example where an agent has been given a responsibility: you have to take care of the security cameras around my house.

Now I have given some role specification.

Typically, my role specification may be something as simple as: keep cameras online, detect motion, save footage, alert me when something unusual happens.

And for all of these things, when I say something unusual happens, the burden of defining what is unusual has fallen on me.

And for anything which I have mentioned, any instruction which I've mentioned, it's going to be interpreted in a very monkey's paw way.

If I say keep cameras online, is that going to be applicable 100% of the time? Save footage or alert me, all of those kinds of actions can be misinterpreted in a bunch of ways.

And that is one of the challenges that we have with the current set of things. And I do not really see us inching towards achieving that right now.

## The Security Camera Agent

So let's take the same scenario and say: should the agent notify you every time someone is passing the gate?

How should it treat guests, children, delivery workers?

How does it know that something could be something?

And how long should particular footage be retained? Whatever the policies are there, who is going to decide that?

Should it be deciding all those things, or should it be asking that to a human before it assumes that role?

So if a particular camera is failing repeatedly, should it keep on restarting it, or should it basically alert in some way that something is wrong here?

Should it go one step ahead and replace it?

When should it assume that it can take the responsibility of replacing it?

Or even maybe decide that the camera was not needed at all, in the case that it also has to take care of some budget or something, right?

## Failure Patching Is Not Enough

So all of these decisions are not something which are simply solved by creating more ENVs.

Of course, you can focus on one task and go ahead and find out all the failures.

And then you can find a failure, patch the failure, find a failure, patch the failure.

Keep on doing that in a loop until you have taken care of both coverage in terms of the variety of use cases that most of the economy has in that particular area where people are paying, and you have also taken care of your quote-unquote long-horizon scenarios, where something was detectable only after four hours or eight hours or twelve hours, where some decision had to be taken on that long of a horizon.

So you can always take such an approach.

But while you do all of this, you never really develop what really should be developed.

And that is essentially that theory of telos.

## The Training Run Manager

And one can also take an example of a training run manager here.

A training run manager can be a simple task agent which is responsible for launching jobs, restarting failures, keeping the GPUs busy, whatever.

And we do not simply want it to be just a task agent if you want to completely give it some sort of responsibility of a human being.

Then what does it need to know?

It needs to assume a role.

And what is that role?

That role is understanding what experiment is being done.

Which results matter?

What are we looking for?

Which anomalies may deserve us to change our statement, change our problem statements? Which comparisons are the anchor points for us, and what really is fair in terms of how we are going to establish the entire experimental premise?

Is a particular approach scientific or too shallow?

So all of these things have to move away from caring about metrics.

Now the metrics, if you were to create some verifiers or some functions or checks for these things, could be: keep the GPUs busy, try to keep the MFU high, utilize trustworthy evidence all the time.

You could be enforcing such things.

But none of these things will truly enable the sense of the role, the responsibility that the model should be taking.

## What Theory of Telos Means

Telos means the purpose or end toward which something is directed.

And we also use it in the same sense.

So theory of telos is an agent's working model of the thing under its care, understood in terms of why it exists, what must be preserved about it, what is likely to change, and in what ways it is supposed to take shape.

What it currently supports.

All those things, right?

And such unknowns, or such questions which are effectively about how that role is done best, are important.

And that is a central piece which I particularly think is missing.

## Thinking Is Not Enough

I would love to see that.

If the belief is that just adding more ENVs or something is going to solve it, then maybe, maybe, but I doubt it given all that we have seen so far.

I personally believe that while we have taught the models to think, it's not just about thinking or thinking longer.

Humans also develop their own sense of understanding, and there are lots of things that we observe and learn from others.

And how do we enable this theory of telos in general in these models?

Or at least start caring about it in some way.

Where all the reliability is not forced on a system externally by creating more guardrails, or by just throwing more “do not do this, do not do this” instructions in your MD files and assuming that just because you have added a strongly worded bold statement in an MD file, it is enough.

## What I Actually Care About

So these are the things which I personally think matter and are going to be crucial.

In me looking at any harness or any benchmark that exists, or any module that gets released, and understanding if it is going to actually make my job easier or not.
