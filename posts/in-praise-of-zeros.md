---
title: "In Praise of Zeros, Part I: Sparsity and Intelligence"
date: 2026-06-08
excerpt: An intuition for why useful intelligence depends on what a representation can silence, isolate, and route.
tags: sparsity, efficiency, representation-learning, model-compression, circuit-extractability, capability-extraction, prism
status: placeholder
category: research
related: honey-i-shrunk-the-circuits
kalpataru: 117, 123, 146, 190, 200
---

*Sparse systems are not just smaller. They make absence part of the computation.*

By Abhishek Mishra

> Working scaffold for a short introductory piece. Target length: about 1,400-1,600 words, or under seven minutes.

## Intelligence as a learned observer

Sparsity is not an objective property of a system. It is an observed property, a fact not about the system but about the relation between the system and whoever is reading it. Ask where, precisely, the sparsity lives. It does not live in the bits. It lives in the basis, and a basis is something an observer has to have learned.

Sparsity is not needing less to represent some information. It is being able to take certain pieces of context, certain pieces of information, for granted. So you are telling me sparsity is not even real? It is real, just not absolute, because depending on who makes the observation, the same system is either sparse or dense, and neither reading is mistaken. It can even be both at once, sparse to one reader and dense to another in the very same moment.

Representation learning makes this precise. The premise is geometric, a claim about where data actually lives. Real data is a low-dimensional distribution embedded in a high-dimensional space, and the work of learning is to pursue and exploit that intrinsic low-dimensional structure, finding the compact coordinates in which the data actually moves. A signal that looks dense against the raw axes of the ambient space can collapse to a handful of active coordinates. The collapse happens once you rewrite it against the axes adapted to its own manifold. Compactness is a measurement, and every measurement needs an instrument that the representation supplies. So the zeros belong not to the information itself but to the alignment between the information and the frame you have learned to view it through.

The old Pokemon break put a single black silhouette on screen and asked, who's this Pokemon? Nothing showed but the outline and the question, with no texture, no color, no detail beyond the boundary curve. Yet if you had watched the show, that outline alone sufficed, and even a child following along answered without effort. The screen delivers almost nothing, a few bits of contour, so the recognition cannot be coming from the screen at all. It comes from a low-dimensional manifold you already learned, the manifold of the show, against which a bare outline is a near-complete coordinate. The representation acts as a world model, a memory of the external world that lets a thin observation be taken for granted rather than reconstructed. The loop closes through you, who are the decoder, while the episodes are the memory, so the loop runs through the person and not the picture. To someone who never watched, the same silhouette carries no recoverable answer at all. It is sparse to one observer and merely cryptic to another. The signal did not change between them. Only the learned frame each of them brought to it differed.

You bring me a matrix, or some other system, and you say, look how few ones are present, surely this is sparse, and surely that is a fact about the matrix, not about me. I would answer that you could write the matrix in that form only because you already held a certain access to the information it encodes. You chose the axes yourself, which is already a decision about how to look. Suppose the same information appeared along some other basis, through some other equation or mode of observation. Nothing guarantees the absences would stay visible to you at all. The zeros you point to do not stand free; they are coordinates that happen to vanish in the basis you picked. You could pick that basis only because you already knew how many dimensions there are. You also knew this information does not extend along the other directions you might have looked from. Strip away that knowledge, remove the ability to represent the same object across alternative axes, and the sparsity dissolves with it. The mostly-zero matrix is the silhouette again in algebraic dress, legible because a frame was already in hand.

Compression is the universal computational principle behind learning such distributions. Reducing the coding length of the data, squeezing it toward its intrinsic dimension, is what produces the compact representation in the first place. Sparsity is the visible residue of a compression that has already succeeded. The coding length is short only because the decoder is long. The zeros are the budget you no longer have to spend, because the structure has been pushed into the axes and into the memory that will supply the rest. The same view unifies methods that otherwise look unrelated, from entropy minimization to lossy compression under rate distortion. It reads each one as a way to shorten the data's coding length. It runs continuously through the classical models. Principal Component Analysis, Independent Component Analysis, and Dictionary Learning all fall under it. Each is, at bottom, a procedure for choosing the frame in which the data goes sparse. Independent Component Analysis and Dictionary Learning do little else; they manufacture exactly the basis in which the absences become evident.

So sparsity sits downstream of an observer who has learned the frame in which absence becomes visible, and learning that frame is itself intelligence, the capability to develop new memory or correct an existing one. When an observer must do this automatically and continuously, the bare act of encoding does not suffice. A decoding path is needed too, so the representation can be checked against the world it claims to compress. That closed loop, a minimax game between encoder and decoder, is how an observer self-corrects toward a frame that holds, with the rate collapsing as the frame is found. There is no observer-free vantage from which a system simply is sparse. There is only the frame, learned or unlearned, and the zeros it lets you take for granted. The Pokemon was always there in the silhouette; you just had to have watched the show.

## The many forms of zeros

Once you see sparsity this way, the word "zero" becomes broader than pruning weights.

There are many places where a system can decide not to spend capacity.

Weight sparsity asks which parameters can be zeroed. Activation sparsity asks which intermediate features need to fire on a given input. Attention sparsity asks which tokens are worth looking at. Token sparsity asks whether the model needs to process every patch, token, frame, or byte. Routing sparsity asks which expert should wake up. Cache sparsity asks what memory should be kept, compressed, evicted, or retrieved. Update sparsity asks whether we need to move all weights, or only a small adapter, low-rank direction, or subset of parameters.

And then there is capability sparsity: can a named behavior run through a small substrate while the rest of the model stays fixed or goes dark?

That is the version most connected to our work. It is not only asking whether the model is smaller. It is asking whether a capability has become separable. Can addition, translation, function calling, refusal, formatting, planning, or some other behavior be isolated enough that we can test it, route it, edit it, or reuse it?

The CS336-style move here is to always ask: what resource is saved? FLOPs, memory, bandwidth, latency, communication, context length, training data, search effort, or interpretability cost? A sparsity claim is incomplete until it names the unit being zeroed, the rule that chooses the zeros, the time at which the zeros are chosen, and the resource that actually gets saved.

This also prevents a common confusion. Sparse on paper is not always efficient in practice. Unstructured weight sparsity can look elegant and run poorly. Routing sparsity can save dense compute while adding communication and load-balancing problems. Token sparsity can save attention work while dropping the evidence needed to answer correctly.

So the middle of the piece should read like opening the model and labeling all the places where silence can enter:

- weights: which parameters do not need to exist?
- activations: which features do not need to fire?
- attention: which positions do not need to be read?
- tokens: which inputs do not need to be processed?
- experts: which subnetworks do not need to wake up?
- cache: which memories do not need to be carried forward?
- updates: which parameters do not need to move?
- capabilities: which behavior can survive inside a small substrate?

The point is not to memorize a taxonomy. The point is to see that sparsity is a recurring shape of intelligence: the system has learned enough structure to spend less everywhere.

## Meaningful zeros

The last section should tighten the standard.

A zero is not meaningful just because it is zero. It is meaningful when the behavior survives without it.

This is the bridge into [Honey, I shrunk the circuits!](/posts/honey-i-shrunk-the-circuits/) and PRISM. The model can have a capability without arranging that capability in a recoverable way. Attribution can find signal. Local pieces can look real. But the stronger question is whether the behavior still runs when the rest is switched off.

That is why the language of mask, scaffold, substrate, recovery, and contract matters. The mask is what we keep. The scaffold is the transformer machinery left in place. The substrate is the kept region that carries the behavior. Recovery measures how much behavior survives. The contract defines what it means for the rest to go dark.

Under that contract, sparsity stops being aesthetic. It becomes a causal claim.

The piece should end by returning to the silhouette. The blacked-out Pokemon is meaningful because the observer can restore the missing creature. A sparse circuit is meaningful for the same reason: the zeros count only if the capability remains recoverable through what is left.

Grounding sources for the draft:

- [Principles and Practice of Deep Representation Learning](https://ma-lab-berkeley.github.io/deep-representation-learning-book/) and its [introductory chapter](https://ma-lab-berkeley.github.io/deep-representation-learning-book/Chx1.html) for the view of representation learning as compact, structured memory over low-dimensional structure in high-dimensional data.
- [CS336: Language Modeling from Scratch](https://cs336.stanford.edu/) for the from-scratch, resource-accounting style.
- Horace Barlow's ["Possible Principles Underlying the Transformations of Sensory Messages"](https://www.cnbc.cmu.edu/~tai/nc19journalclubs/Barlow-SensoryCommunication-1961.pdf) for efficient coding and redundancy reduction.
- Olshausen and Field's ["Emergence of simple-cell receptive field properties by learning a sparse code for natural images"](https://doi.org/10.1038/381607a0) for sparse coding as learned visual representation.
- Rao and Ballard's ["Predictive coding in the visual cortex"](https://doi.org/10.1038/4580), plus ["Predicting the visual world: silence is golden"](https://www.nature.com/articles/nn0199_9), for the idea that perception can transmit surprise rather than restating everything.
