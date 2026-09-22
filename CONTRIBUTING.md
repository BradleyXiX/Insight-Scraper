# Contributing to Foundry-SaaS

First off, thank you for considering contributing to Foundry-SaaS. It's people like you that make Foundry-SaaS such a great tool.

## 1. Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## 2. Fork & create a branch

If this is something you think you can fix, then fork Foundry-SaaS and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-stripe-webhook-support
```

## 3. Get the test suite running

Make sure you're using Docker Compose to spin up your local environment as described in the README.md.

## 4. Implement your fix or feature

At this point, you're ready to make your changes. Feel free to ask for help; everyone is a beginner at first.

## 5. Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with Foundry-SaaS's master branch:

```sh
git remote add upstream git@github.com:BradleyXiX/Insight-Scraper.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of master, and push it!

```sh
git checkout 325-add-stripe-webhook-support
git rebase main
git push --set-upstream origin 325-add-stripe-webhook-support
```

Finally, go to GitHub and make a Pull Request.

## 6. Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

## 7. Merging a PR (maintainers only)

A PR can only be merged into main by a maintainer.
