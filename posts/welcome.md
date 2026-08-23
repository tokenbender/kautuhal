---
title: Hello, I'm Tokenbender
date: 2024-08-24
excerpt: I like making models do things they have no business doing at their size.
tags: meta, llm, engineering, capability-extraction
status: evergreen
category: personal
---

<figure class="intro-portrait">
  <img src="/portrait-tokenbender.webp" alt="Portrait of Abhishek Harshvardhan Mishra" width="1158" height="1359" loading="eager" decoding="async">
  <figcaption><strong>Abhishek Harshvardhan Mishra</strong><span>ML Researcher · Writes as tokenbender</span></figcaption>
</figure>

Hello!

I am Abhishek Harshvardhan Mishra, though most people who know my work online know me as tokenbender.

Before all this, I was a technical lead at Intel working on server firmware. Then language models ate my brain.

I like making models do things they have no business doing at their size.

<section class="journey-tree" aria-labelledby="journey-tree-title">
  <header class="journey-tree-header">
    <span class="journey-tree-kicker">A rough chronology</span>
    <h2 id="journey-tree-title">The route so far</h2>
  </header>
  <ol class="journey-tree-line">
    <li class="journey-tree-event journey-tree-event-left journey-tree-root">
      <span class="journey-tree-date">Before 2023</span>
      <div class="journey-tree-work">
        <strong>Intel</strong>
        <span>Technical lead working on server firmware.</span>
      </div>
    </li>
    <li class="journey-tree-event journey-tree-event-right">
      <time class="journey-tree-date" datetime="2023-07">Jul 2023</time>
      <a class="journey-tree-work" href="https://huggingface.co/TokenBender/llama2-7b-chat-hf-codeCherryPop-qLoRA-merged">
        <strong>CodeCherryPop</strong>
        <span>The first friendly local coder of the Llama 2 era.</span>
      </a>
      <div class="journey-glaze">
        <button class="journey-glaze-toggle" type="button" aria-expanded="false">Receipts</button>
        <div class="journey-glaze-card" aria-label="CodeCherryPop receipts">
          <span class="journey-glaze-kicker">Jul 2023 · Independent receipts</span>
          <strong class="journey-glaze-claim">#1 Llama 2 coder.</strong>
          <p class="journey-glaze-lede">Beat models 10× its size.</p>
          <ul class="journey-glaze-proofs">
            <li>
              <a href="https://www.reddit.com/r/LocalLLaMA/comments/156htzy/">
                <span class="journey-glaze-index">01</span>
                <span><b>Benchmark</b> Maintainer-confirmed lead in the Llama 2 filter.</span>
              </a>
            </li>
            <li>
              <a href="https://www.reddit.com/r/LocalLLaMA/comments/16rv6b5/">
                <span class="journey-glaze-index">02</span>
                <span><b>Word of mouth</b> Independently praised as an all-rounder beyond coding.</span>
              </a>
            </li>
            <li>
              <a href="https://huggingface.co/TheBloke/llama2-7b-chat-codeCherryPop-qLoRA-GGUF">
                <span class="journey-glaze-index">03</span>
                <span><b>Local use</b> Independently distributed across low-bit formats.</span>
              </a>
            </li>
          </ul>
          <span class="journey-glaze-meta">7B · 122K code instructions · released three days after Llama 2</span>
        </div>
      </div>
    </li>
    <li class="journey-tree-event journey-tree-event-left">
      <time class="journey-tree-date" datetime="2023-11">Nov 2023</time>
      <a class="journey-tree-work" href="https://huggingface.co/TokenBender/evolvedSeeker_1_3">
        <strong>EvolvedSeeker</strong>
        <span>68.29% HumanEval from a 1.3B coding model.</span>
      </a>
      <div class="journey-glaze journey-glaze-left">
        <button class="journey-glaze-toggle" type="button" aria-expanded="false">Receipts</button>
        <div class="journey-glaze-card" aria-label="EvolvedSeeker receipts">
          <span class="journey-glaze-kicker">Nov 2023 · Release-window receipts</span>
          <strong class="journey-glaze-claim">#1 coder in the 1B class.</strong>
          <p class="journey-glaze-lede">Beat models 12× its size.</p>
          <span class="journey-glaze-voice">“1.3B with 68.29% HumanEval lol, don't behead me.”</span>
          <ul class="journey-glaze-proofs">
            <li>
              <a href="https://huggingface.co/TokenBender/evolvedSeeker_1_3">
                <span class="journey-glaze-index">01</span>
                <span><b>Result</b> 68.29% HumanEval with all 164 generated samples preserved.</span>
              </a>
            </li>
            <li>
              <a href="https://www.reddit.com/r/LocalLLaMA/comments/181h3lv/">
                <span class="journey-glaze-index">02</span>
                <span><b>At the time</b> Above DeepSeek 1.3B and close to the 34B frontier.</span>
              </a>
            </li>
            <li>
              <a href="https://huggingface.co/TheBloke/evolvedSeeker_1_3-GGUF">
                <span class="journey-glaze-index">03</span>
                <span><b>Local use</b> Independently distributed from 2-bit through 8-bit.</span>
              </a>
            </li>
          </ul>
          <span class="journey-glaze-meta">1.3B · 50K instructions · free-Colab inference · transparent eval samples</span>
        </div>
      </div>
    </li>
    <li class="journey-tree-event journey-tree-event-right">
      <time class="journey-tree-date" datetime="2024-02">Feb 2024</time>
      <a class="journey-tree-work" href="https://huggingface.co/TokenBender/Navarna_v0_1_OpenHermes_Hindi">
        <strong>Navarna</strong>
        <span>Hindi chat and retrieval-augmented generation.</span>
      </a>
    </li>
    <li class="journey-tree-event journey-tree-event-left">
      <time class="journey-tree-date" datetime="2025-05">May–Aug 2025</time>
      <a class="journey-tree-work" href="https://github.com/tokenbender/avataRL">
        <strong>avataRL</strong>
        <span>Language-model training from random weights using critic-guided reinforcement learning.</span>
      </a>
    </li>
    <li class="journey-tree-event journey-tree-event-right">
      <time class="journey-tree-date" datetime="2025-08">Aug 2025</time>
      <a class="journey-tree-work" href="/posts/infinite-a-rubric-driven-prioritized-replay-to-maximise-continual-learning/">
        <strong>infinite</strong>
        <span>Rubric-driven prioritized replay for continual learning.</span>
      </a>
    </li>
    <li class="journey-tree-event journey-tree-event-left journey-tree-current">
      <time class="journey-tree-date" datetime="2026-05">May 2026</time>
      <a class="journey-tree-work" href="/posts/honey-i-shrunk-the-circuits/">
        <strong>Low-rank circuit conditioning</strong>
        <span>91.33% recovery from 5.05% of a model's MLP channels.</span>
      </a>
    </li>
  </ol>
  <div class="journey-tree-tip" aria-label="Current direction">
    <span>Now</span>
    <strong>Extract the capability, not the whole model.</strong>
  </div>
</section>

The cleanest early example is EvolvedSeeker. I started with the 1.3B-parameter DeepSeek Coder base, fine-tuned it, and got **68.29% on HumanEval**. No heroic origin story. I just wanted to see how much coding ability I could squeeze into something that small.

[The evaluation is still preserved here](https://huggingface.co/TheBloke/evolvedSeeker_1_3-AWQ/blob/main/README.md), along with the [original discussion](https://www.reddit.com/r/LocalLLaMA/comments/181h3lv/13b_with_6829_humaneval_lol_dont_behead_me_part/).

Of course, once you get interested in small models, you eventually ask a worse question: why does a capability need the rest of the model at all?

A model can know how to add numbers, write code, or follow a format, but there is usually no neat little part you can point to and say, "there, that is the thing doing it." The ability is smeared across the network. You can use it, but good luck trying to pick it up and move it somewhere else.

That is the rabbit hole Krishna Pagare and I have been disappearing into. We came up with **low-rank circuit conditioning**, where we keep the model's behaviour intact but push one of its existing capabilities into a form that is easier to isolate.

Before conditioning, compact circuit recovery stalled at **29%**. Afterwards, we recovered **91.33%** of the full autoregressive behaviour from **5.05% of the model's MLP channels**.

[The full experiment is in *Honey, I Shrunk the Circuits!*](/posts/honey-i-shrunk-the-circuits/)

Now, we cannot pop that circuit out and run it by itself. If we could, I would say so. What we have is the handle we would need first: a small causal part that keeps carrying the behaviour even when we mess with the model around it.

That is broadly what I am here for. I want capabilities we can teach without imitation, find without guesswork, inspect while they run, edit without retraining everything, and eventually use without dragging the entire original model along.

Most things I publish here come from somewhere inside that mess. Sometimes it is the experiment. Sometimes it is the machinery I built because the experiments kept breaking my workflow. Sometimes it is simply an idea I could not leave alone.
