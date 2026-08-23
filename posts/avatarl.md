---
title: avatarl: Training Language Models from Scratch with Pure Reinforcement Learning
date: 2025-08-09
excerpt: Replacing cross-entropy pretraining with a principled RL objective using expert-consensus rewards over active tokens.
tags: reinforcement-learning, language-models, pretraining
status: research
category: research
---

> "If you know the way broadly, you will see it in all things." — Miyamoto Musashi

## Abstract

Standard language model pre-training relies on a cross-entropy objective, which rigidly teaches the model that only a single token is the correct continuation for a given context. This is a fundamentally incomplete representation of language, where multiple continuations are often plausible.

avatarl addresses this by replacing the traditional cross-entropy objective with a sophisticated **reinforcement learning (RL) framework**. During the pre-training phase, a player model learns from a **continuous reward signal** derived from a pre-trained critic and ground-truth reality. This allows the player to learn a rich, distributional understanding of language, rewarding it for predicting tokens that are not just the single 'correct' answer but are also plausible alternatives, as judged by the critic. This approach represents a more principled pre-training objective, designed to create models with a deeper and more nuanced understanding of language from the very beginning [1].


---

## Understanding avatarl

Imagine you're teaching a child (the player model) how to play a piano.

**Traditional pretraining**: the piano student sits with a strict teacher who slaps their hand every time they hit the wrong key. "No! Only C# here! Never D!" The student memorizes thousands of songs note-by-note and is terrified of mistakes. This creates a technically perfect but robotic player who can only reproduce what they've memorized.

**avatarl's RL approach**: the student plays in a jazz club with an experienced critic watching. Instead of punishment, they get applause. Loud cheers for perfect notes, moderate clapping for harmonious alternatives, polite claps for creative attempts. The critic (a seasoned jazz pianist) whispers suggestions: "try a B♭ there, it creates tension" the student learns not just what's "correct" but what's musically meaningful.

In RL terms:
- **State**: the musical context (previous notes played)
- **Action**: choosing the next note
- **Reward signal**: continuous applause (0 to 1)
- **Policy**: the student's evolving musical intuition
- **Critic**: provides expertise without dictating every note

The best part starts when the student starts improvising - they play their own ideas (student top-k), consider the critic's suggestions (critic top-k), while keeping the original melody in mind (ground truth). Over time, they develop their own style while respecting musical theory. This is reinforcement learning i.e. learning through rewards rather than rigid correction, discovering patterns through exploration rather than memorization.

### Standard Pretraining => One-hot Encoded Lottery
There is RL everywhere for those with the eyes to see.
This is your traditional pretraining but you can also think of it as REINFORCE with binary rewards.
```ascii
   standard cross-entropy loss

   context: "the cat..."

   [sat] [jumped] [ran] [slept]
     ↓      ↓       ↓      ↓
    WIN    LOSE    LOSE   LOSE

   payout rules:
   - hit the exact word from training data = win $1
   - hit anything else = lose

```

### avatarl => Progressive Reward Lottery
We can reimagine the same problem as a progressive reward lottery.

```ascii
   avatarl's continuous rewards

   context: "the cat..."

   [sat] [jumped] [ran] [slept]
     ↓      ↓       ↓      ↓
    HIGH    MED     LOW    TINY

   payout rules (from expert consensus):
   - ground truth (sat) = $82
   - critic's favorites = $10-45
   - plausible alternatives = $1-9
   - noise = nothing

```
---

## The Problems with RL in Pre-training Language Modeling

Now how do we design this around some of the challenges we face in RL?

### Intuition

Let us look at how we teach the model traditionally. Standard pretraining with cross-entropy loss for predicting the next token. This can be visualised as a special case of REINFORCE algorithm where only the gold token gets reward 1.0 and all others get 0 [3]. So we can at least create a binary reward where gold token gets 1 and all others get 0. The challenge of framing pretraining as an RL problem isn't hard however there are a few concerning points.

```ascii
   broadly RL looks like this:

   step 1: sample action (probability of each action - inverse of size of action space)
   step 2: run rollout (reward for each action)
   step 3: update policy (gradient descent)
```

The first problem is that **the action space is too large for a language model** on token level because the entire vocab size is ~50k. And one of the biggest reasons we do pretraining before RL is to make sure the most probable actions are the ones that are most likely to be correct. So if we expect chances of correct token to be present in top 64 choices, we can rollout 64 times and get the reward for each action. However, without pretraining, the probability of next token being correct is random chance - 1/50k i.e. 0.002% so if you do rollouts you'd get 0.002% * 64 = 0.128% chance of getting the correct token. Huge number of rollouts per step and such low reward signal makes it computationally extremely expensive to train a model using pure RL.

The second problem is that the **win condition is not absolutely clear**. Traditional RL in games is something with deterministic win or loss. Each action being rewarded or punished enforces the model to learn the correct action over a limited space. However, in language modeling, the win condition is not clear, given the context the right way to predict the next token could vary a lot. And this creates a challenge that if you wanted to have a clear win condition or if you wanted to have a smooth probabilistic range of partial reward, then that becomes extremely hard with large language models. The model is not trying to win a game, it is trying to minimise the loss over predicting the next token. And the bigger the context is, the more variation can be expected in what could be the correct next token.

At its core, avatarl reframes language model pre-training as a reinforcement learning problem. The student model is an RL agent that learns to make decisions (predicting the next token) in an environment (the text sequence so far). This approach aligns with the reincarnated RL paradigm [8], where we reuse prior computational work (the pre-trained critic) rather than starting from scratch.

As a solution to first problem, we can use a smaller action space. But reducing the action space arbitrarily does nothing. We apply something which is called **active token filtering** to eliminate the inconsequential tokens. We use the critic model to share its knowledge of the world (critic top k) and the student does the same (student top k). We combine this with the ground truth to create a subset of actions that are most likely to be correct (max `2*k + 1` action space). The student learns from the highly likely actions. For sampling-related context in language models, see top-k and nucleus (top-p) sampling analyses [5].

For the second problem, we need something to act as a mechanism to provide a smooth reward range which can provide appropriately reward the actions. Simply relying on just gold token keeps the reward signal sparse and relying on just critic distribution either becomes distillation if the critic is a bigger teacher model. It also puts a cap on the value from the reward signal, the student model does not derive value after reaching similar level as the critic. We need an option to leverage the reward signal from the critic and the student. And ideally create a method which teaches the model richer distribution than just one-hot encoding and also does not remain capped on the value from the critic reward.

The entire process can be visualized as a simple loop:
```ascii
+-------------------+      +-------------------+
|   state s_t       | ---> | student policy    |
|  (context tokens) |      | π_θ(s_t) → logits |
+-------------------+      +-------------------+
            |                         |
            |         +---------------+---------------+
            |         |                               |
            v         v                               v
     +-----------+  +-----------+               +-------------+
     | top-k_s   |  | top-k_c   |               | gold token  |
     | (student) |  | (critic)  |               | a*_t        |
     +-----------+  +-----------+               +-------------+
            \            |   |                       /
             \           |   |                      /
              \          v   v                     /
               +----------------------------------+
               | filtered actions A_t             |
               | (≤ 2k + 1, deduped)             |
               +----------------------------------+
                            |
                            v
               +----------------------------------+
               | reward model (expert consensus):|
               | reality + critic (blend);       |
               | active-token smoothing          |
               +----------------------------------+
                            |
                            v
               +----------------------------------+
               | r_i over A_t: renorm on A_t      |
               | reward only above-mean; clamp max|
               +----------------------------------+
                            |
                            v
               +----------------------------------+
               | REINFORCE update                 |
               | L = -Σ_i r_i · log π_θ(a_i|s_t) |
               | + entropy bonus                  |
               +----------------------------------+
                            |
                            v
               +----------------------------------+
               | update θ; pick a_t ∈ A_t         |
               | append to context → s_{t+1}      |
               +----------------------------------+
                            |
                            v
                          (loop)
```

Notation used above: `s_t` = context at time t (tokens so far); `a*_t` = ground-truth next token; `A_t` = student top-k ∪ critic top-k ∪ `{a*_t}` (deduped, ≤ `2k+1`); `π_θ(a|s_t)` = student policy over tokens; `r_i` = reward for action `a_i ∈ A_t`.

In **avatarl reward mechanism**. Instead of a sparse `+1` for the correct token and `0` for all others, we construct an "ideal" reward model at each step that provides a dense, continuous reward signal for any potential action. This reward model is an **expert consensus**.

## How to Combine the Reality and the Critic?

### The Expert Consensus Problem → Active-Token Smoothing
There’s a subtle problem with expert consensus if we’re not careful. If the reality expert
is one-hot, rewards become ultra-sparse and the student gets almost no exploration signal.
If we lean only on the critic, we cap the student at the critic’s quality and inherit its
biases. If we smooth over the full vocabulary, we sprinkle reward on implausible junk and
dilute the gradient.

The rationale is simple: give plausible alternatives a fair chance without rewarding noise.
Most of the probability should remain on what actually happened (the ground truth), but a
small ε should be shared only among tokens that are likely in this context. This keeps
exploration focused, plays nicely with the critic’s judgement, and stabilizes the
REINFORCE update.

The process inside expert consensus looks like this:
```ascii
active-token smoothing within expert consensus (reality + critic)

context s_t
   |
student top-k_s     critic top-k_c     gold a*
        \             |      |            /
         \            |      |           /
          +--------------------------------------+
          | A_t = dedup(top-k_s ∪ top-k_c ∪ {a*}) |
          | (≤ 2k + 1 tokens)                      |
          +--------------------------------------+
                      |
                      v
reality distribution over A_t:
- a* gets 1 - ε
- others in A_t share ε / (|A_t| - 1)
- outside A_t gets 0
                      |
                      v
critic distribution (restricted to A_t)
                      |
                      v
expert consensus (blend reality + critic)
- renormalize only on A_t
- above-mean mask + clamp
                      |
                      v
final rewards r_i over A_t → used by REINFORCE
```

#### 1. The Ground Truth Expert

We need to create a reward signal for the ground truth token. We can do this by using a one-hot encoding over the full vocabulary. However, this is not a good signal for the model to learn from. We need to create a reward signal that is more informative. We can do this by using a label smoothing technique.

```ascii

   before: one-hot over full vocab       after: active-token label smoothing (A_t only)
   ┌──────────────────────────────┐      ┌──────────────────────────────────────────────┐
   │ ground truth a* = 100%      │      │ A_t = dedup(top-k_s ∪ top-k_c ∪ {a*})       │
   │ everything else = 0%        │  →   │ |A_t| ≤ 2k+1 (≈ 33 when k=16)               │
   └──────────────────────────────┘      │                                              │
                                         │ p_reality(a*) = 1 - ε                        │
                                         │ p_reality(a ≠ a*, a ∈ A_t) = ε/(|A_t|-1)     │
                                         │ p_reality(a ∉ A_t) = 0                       │
                                         │                                              │
                                         │ example: k=16, ε=0.10, |A_t|=33               │
                                         │   a* = 90.000%                                │
                                         │   each other in A_t ≈ 0.3125%                 │
                                         └──────────────────────────────────────────────┘

   "we already have the ground truth, but we’ll share a small ε only among the ~2*k + 1 tokens
    that actually matter in this context — nothing for the rest."
```

#### 2. Using the Critic Expert as the Calibrated Judge

To create plausible alternatives, we can use the critic model. The critic model is a pre-trained model that has been trained to predict the next token. We can use the critic model to create a reward signal for the purpose.

```ascii

   ┌─────────────────────┐
   │ based on model priors:   │
   │ "sat" = 60%            │
   │ "slept" = 30%          │
   │ "jumped" = 8%          │
   │ "flew" = 2%            │
   └─────────────────────┘

   "many things could work here; we score them consistently."
```

### The Expert Consensus

We can combine their reward signals using a **weighted geometric mean**:

```ascii

   reality (70% weight)         critic (30% weight)
          \                          /
           \    geometric mean      /
            \    p^0.7 × p^0.3     /
             \                    /
              [combined wisdom]
                      |
                      v
            ┌─────────────────┐
            │ final rewards:   │
            │ "sat" = 82%     │  <-- ground truth still wins
            │ "slept" = 15%   │  <-- but critic's ideas get credit
            │ "jumped" = 2%   │  <-- even small ideas matter
            │ "flew" = 0.1%   │  <-- tiny but non-zero to promote exploration
            └─────────────────┘
```

```ascii
   the formula visualized

   reality expert says:          critic expert says:
   ┌──────────────┐             ┌──────────────┐
   │ "sat" = 0.9  │             │ "sat" = 0.6  │
   │ others = 0.1 │             │ "slept" = 0.3│
   └──────────────┘             │ "jumped"= 0.08│
          ↓                      └──────────────┘
          ↓ power of 0.7                ↓ power of 0.3
          ↓                             ↓
      0.9^0.7 = 0.93            0.6^0.3 = 0.86
          ↓                             ↓
          └─────────────┬───────────────┘
                        │
                    multiply
                        │
                   0.93 × 0.86
                        │
                     = 0.80
                        │
                  (normalize all)
                        │
                        ↓
              ┌─────────────────┐
              │ "sat" = 82%     │  <-- ideal reward
              │ "slept" = 15%   │  <-- decent reward
              │ "jumped" = 2%   │  <-- try again
              └─────────────────┘
                        ↓
                 scale by 100
                        ↓
              rewards then sparsified (above-mean),
              and proportionally capped per position (≤ 1.5)
```

**Intuition**: for a token to receive higher rewards, both experts must agree. The smoothed reality expert ensures the ground truth is strongly preferred without completely vetoing alternatives, while the critic expert provides a smooth gradient of preferences for all plausible tokens. The resulting probabilities serve directly as positive rewards.

### The Mathematical Model of the Reward Signal

A key insight of avatarl is that we do not create a reward for a *single* action the student takes. Instead, we first construct a **dense reward landscape** for *active filtered tokens*, and then we evaluate the student's policy against this landscape.

**1. Defining the experts mathematically**

Let `a` be a potential action (a token) and `a*` be the ground-truth token from the dataset.

-   **The groundtruth expert, `p_reality(a | s)`**: this expert strongly prefers the ground-truth token `a*` but uses **active token label smoothing** to maintain a continuous distribution.
    -   `p_reality(a | s) = 1 - ε` if `a = a*` (where `ε = 0.1`)
    -   `p_reality(a | s) = ε / (num_active - 1)` if `a ∈ active_tokens` and `a ≠ a*`
    -   `p_reality(a | s) = 0` if `a ∉ active_tokens` (i.e. not in the active filtered tokens)

    where `active_tokens` = student's top-k ∪ critic's top-k ∪ {ground truth} (typically ≤32 tokens after deduplication)

    this gives 90% probability to the ground truth and distributes 10% **only across active tokens** rather than the entire vocabulary. this concentrates the exploration signal on relevant alternatives instead of wasting it on 50,000+ irrelevant tokens.

-   **The critic expert, `p_critic(a | s)`**: the critic model's probability distribution over the vocabulary.
    -   `p_critic(a | s) = softmax(critic_logits)`

**2. The expert consensus formulation**

The ideal distribution, `p_ideal`, is the **weighted geometric mean** of the two expert distributions:

`p_ref(a | s) ∝ [p_reality(a | s)]^w_r * [p_critic(a | s)]^w_m`

Here `w_r` (reality_weight) and `w_m` (mentor_weight) are the expert weights; defaults are 0.7 and 0.3 respectively. After normalization on the action set A, this gives us a proper probability distribution. The resulting `p_ref` serves as our **positive reward signal**—a vector over A containing the calibrated "ideal" probabilities (and thus rewards).

**3. Evaluating the student's policy**

The student's policy, `π_student(a | s)`, is judged against this reward landscape. The policy gradient loss aims to move the student's distribution closer to the ideal one. The reinforce rule is `loss = -e_{a ~ π_student} [ r(a) ]`, where our reward `r(a) = p_ideal(a | s)`—we also add an entropy bonus `−β·H[π_θ(·|s)]` to encourage exploration, with `β = entropy_coefficient` (default 0.01) [2, 4]. In practice, stable policy-gradient updates often use PPO-style clipping and variance reduction such as GAE [6, 7].

#### Learning to Calibrate the Critic Internally

By including the student's top-k predictions in the action space, we create a self-reinforcement mechanism. Not only the model learns to predict the ground truth, but also learns to calibrate the critic's predictions via its own top-k predictions.

**Concurrent top-k evaluation**

Instead of sampling actions and performing k sequential rollouts, avatarl concurrently evaluates the student's top-k, the critic's top-k, and the gold token — an efficient 2k+1 rollout-equivalent with guided exploration. Specifically:
- We evaluate all actions in the expanded action space (~2k+1 tokens) simultaneously
- Each action gets its reward from the pre-computed expert consensus reward model
- The student's entire probability distribution over these actions is updated via policy gradient

```ascii
   typical rl (k sequential rollouts):        avatarl (2k+1 rollout-equivalent, concurrent):

   sample action → run rollout (×k)       gather student top-k + critic top-k + gold
   sample action → run rollout            ↓
   sample action → run rollout            compute rewards for all selected actions
   ...repeat n times...                   ↓
   ↓                                      update policy on all actions
   average rewards                        simultaneously
   ↓
   update policy                          one concurrent pass, guided exploration

   [slow & high variance]                [fast & low variance]
```

For efficient pretraining we avoid Monte Carlo sampling, and instead do **exhaustive evaluation** over the reduced action space.

**The mathematical truth**:
```python
# what avatarl doesn't do (sequential per-token rollouts):
for rollout in range(num_rollouts):  # no sequential rollouts per token
    action = sample_from_student()   # no stochastic rollout sampling at train time
    reward = run_episode(action)     # no multi-step episodes per token

# what avatarl actually does (k-rollout-equivalent, concurrent):
action_space = student_top_k ∪ critic_top_k ∪ ground_truth  # ~32 actions
rewards = consensus_model(action_space)  # pre-computed for all actions
loss = -sum(log_prob(action) * reward for action in action_space)  # update all at once
```

**Per-prediction statistics**:
- **Rollout-equivalent**: 2k+1 (student k + critic k + gold), evaluated concurrently
- **Actions evaluated**: ~2k+1 (entire expanded action space)
- **Samples drawn**: deterministic top-k selection (or top-p if enabled)
- **Reward computations**: ~2k+1 (one per action in space)
- **Gradient updates**: 1 (single policy gradient step)

## Results

avatarl has been completely open sourced and researched in the open from day 1.
Hence what you see are the earliest results after getting it to work.

We successfully validated the approach on a model in size range of 30M-250M parameters using avatarl. In each case, we used a critic model of size 30M parameters. Around 2B tokens were used for training where the dataset used for this was [OpenWebText](https://huggingface.co/datasets/Skylion007/openwebtext).

For the same param size, the avatarl trained model can reach similar cross-entropy loss as a standard pretrained model.

avatarl also allows us to train the models for equivalent of 50-60B tokens on 2B tokens of data because of the dense reward signal.

This is how the training and validation curves look like for a 250M parameter model, validated every 500 steps.

### Training Loss Against Combined Distribution (2k+1)
![train_curves](/posts/images/train_loss.png)

### Average Reward Progress
![avg_reward](/posts/images/avg_reward.png)

### Cross-Entropy Loss
![ce_loss](/posts/images/ce_loss.png)

## Samples

### Generated Text Examples

**Prompt:** *"The true meaning of life is often"*

---

#### Sample 1
> The true meaning of life is often more complex than the actual cause, but we can think so much about each of them if we take into account the real and possible work that underlies an individual's character and personality.
>
> When we do that, the very nature of our relations with other people takes us into their distinct forms and carries them far into their various circumstances. When a particular person is isolated from the "ideal" circle of people with whom we have worked – and others who are displaced from the

#### Sample 2
> The true meaning of life is often an all-consuming exchange of goods — real commodities such as gold, services such as medicine, clothes and appliances — while also building up a certain personal meaning for all: this change helps us begin to transcend some material barrier to the search for meaning. Rather than content, though, we are simply noticing how the changes our material conditions are also creating.
>
> Today, it's easy to underestimate how life can transition, if we didn't think so. Increasingly, health and education are more about

#### Sample 3
> The true meaning of life is often put in terms of one's relationship with us. "There is life of this for us as well," Mr. Adams says. "For me, the meaning of life was precisely this."<|endoftext|>I was delighted to be offered the opportunity to see David Koretzner, one of my favorite television reporters who came into the world on such a busy note that I couldn't turn down this season's worth of tweets. Only four of them came

#### Sample 4
> The true meaning of life is often malleable by the way they can change and change more naturally. If no matter how many lives they provide, life continues to be a process of change, and thus human life is often incomplete.
>
> Is Life Any Better? If so, with all the information about human nature you would like to know about but have no knowledge about human nature, you might ask yourself why. It is not, in order to understand it, to practice and follow as best we can. The journey of your

#### Sample 5
> The true meaning of life is often unknown: Death through illness has in fact brought death from one's own body into another.
>
> Many now seem to see this in the light of a number of ways to die. But rather than focus on dying, we look to be on the look out for what death will bring to us. The notion of death is less cruel than life; death is more honest in each of its parts.
>
> If the death of evil goes on all around us, our act of anger may well follow

#### Sample 6
> The true meaning of life is often determined by circumstances and relationships. As such, personal freedom is a process unto itself and not something else.
>
> This might seem like a completely false premise to be a "mystical situation." However, the fact that every species has at least some sort of a right to life outside of its senses and attitudes shows it, quite literally, to be a person.
>
> In other words, what the individual doesn't have is a right to life of their own free

#### Sample 7
> The true meaning of life is often one of 'making up your mind'.
>
> It takes a lot of hard work and dedication every day for somebody to realize they are doing something amazing. After three years of planning and constant training it was almost clear that they had formed one of the best teams I've ever been given.
>
> My team worked hard. I had a pretty amazing package coming out of the kit room after sending home a huge package. Doing the team thing took time because there were times when there was absolutely nothing I

#### Sample 8
> The true meaning of life is often about a certain general understanding of our existence and how we cope with our suffering. This is how people of a certain age, or a particular religious persuasion, perceive our existence.
>
> We are now reminded that our understanding is limited in comparison to the scope of relationships within us. The way that we may assess ourselves under the ideal of our being the sum of our self-interest, we may do it to others and to oneself in order to make our bodies and identities relevant, but it will be

## Conclusion

Cross-entropy-based next-token prediction pretraining as a bitter-lesson-pilled approach works. I have no issues against it. Think of this as an enquiry into three points:
1. People believing without strong base model RL doesn't work - so why can't the method used for avatarl (action space filtering and smoothing) work for them?
2. How different is the sample efficiency of learning for a model pretrained with RL?
3. Is this something that can create models with more nuanced understanding of language and benefit from better calibration of top k?

I originally started this as a cacklemaxxing project (idea which if it works would make me laugh). I am just doing it for satisfying questions in my head.

## Future Work
This is a very early stage of the research.
I understand that to many trained eyes this feels incomplete.
I am also primarily a hacker and you may sniff it across my work.

The AGI lab is understaffed (one person—me), and we are planning to do the following:
- avatarl training objective as gradually sequence level training objective not just tokens
- Train for tool use and minimal world knowledge with pure RL - how small of a banger tool calling model can we get?

If you wish to pick these ideas for yourself or if you wish to collaborate, let me know.
I would appreciate any support in the form of sponsorship, compute or research collaboration.

I would be sharing discussion on the approaches that I took but didn't succeed as well.

## Acknowledgements
[Chinmay Kak](https://x.com/ChinmayKak), who discussed this with me on call and instantly started hacking the idea using GRPO. The skeleton code for the earliest version was written by him.

[Telt](https://x.com/twofifteenam) for the support and compute.

[Ravi Theja](https://x.com/ravithejads) for taking initiative on his own to put me in touch with @except_raised.

Huge thanks to everyone who reposted, shared and got it the initial attention, I appreciate all of you.

Modal is awesome. It makes running experiments simple. No worrying about instance management or forgotten resources—it just works. It suits my ADHD hacker brain very well.

The infrastructure is solid too. Cold starts that take just 5-6s time let me hack things out locally and simply trigger the job with a command.


## Sponsorship
This work was sponsored for compute credits by [@except_raised](https://x.com/except_raised), [@twofifteenam](https://x.com/twofifteenam) and [@modal_labs](https://x.com/modal_labs)


## Code

Everything is open sourced and available on [GitHub](https://github.com/tokenbender/avataRL).

## References

[1] Dong, Q., Dong, L., Tang, Y., Ye, T., Sun, Y., Sui, Z., & Wei, F. (2025). Reinforcement Pre-Training. ArXiv:2506.08007.

[2] Hong, J., Dragan, A., & Levine, S. (2024). Q-SFT: Q-Learning for Language Models via Supervised Fine-Tuning. ArXiv:2411.05193.

[3] Norouzi, M., Bengio, S., Chen, Z., Jaitly, N., Schuster, M., Wu, Y., & Schuurmans, D. (2016). Reward Augmented Maximum Likelihood for Neural Structured Prediction. NeurIPS 2016.

[4] Shen, S., Cheng, Y., He, Z., He, W., Wu, H., Sun, M., & Liu, Y. (2016). Minimum Risk Training for Neural Machine Translation. Proceedings of ACL 2016.

[5] Ranzato, M. A., Chopra, M., Auli, M., & Zaremba, W. (2016). Sequence Level Training with Recurrent Neural Networks (MIXER). ICLR 2016.

[6] Bahdanau, D., Brakel, P., Xu, K., Goyal, A., Lowe, J., Pineau, J., Courville, A., & Bengio, Y. (2017). An Actor–Critic Algorithm for Sequence Prediction. ICLR 2017.

[7] Peters, J., & Schaal, S. (2007). Reinforcement Learning by Reward-Weighted Regression for Operational Space Control. ICML 2007.

[8] Agarwal, R., Schwarzer, M., Castro, P. S., Courville, A., & Bellemare, M. G. (2022). Reincarnating Reinforcement Learning: Reusing Prior Computation to Accelerate Progress. NeurIPS 2022. ArXiv:2206.01626.

[9] Furlanello, T., Lipton, Z., Tschannen, M., Itti, L., & Anandkumar, A. (2018). Born Again Neural Networks. Proceedings of ICML 2018, PMLR 80:1607-1616. ArXiv:1805.04770.
