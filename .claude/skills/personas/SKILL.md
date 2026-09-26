---
name: personas
description: Check any screen, form field, dashboard card, report, nav entry, onboarding step or skill against NinerLog's binding personas (../ninerlog-api/docs/PERSONAS.md) and the discipline relevance rules (fold never hide, data always wins, fail open, explain yourself). Use before designing UI, before committing anything that changes what a pilot sees, when adding a field to FlightForm/AircraftForm/LicenseForm, and when reviewing a PR. Especially for anything touching gliders, TMGs, ultralights, IFR, multi-crew or instructors.
---

# Persona check

`../ninerlog-api/docs/PERSONAS.md` is binding on this repo. Nine personas — Lena (club
glider), Jonas (glider student), Karl (TMG), Petra (cross-country, self-launch, tow pilot,
FI(S)), Mehmet (three-axis UL), Sabine (trike + powered paraglider), and the guards Mark
(airline), Anna (PPL converting to gliders) and Ruth (empty account). Each has "must see",
"must fold away" and numbered acceptance scenarios. **A UI change is not done until you have
looked at it as the personas it touches.**

If the API repo is not checked out next to this one, fetch the file from
`fjaeckel/ninerlog-api` `docs/PERSONAS.md` — never work from memory.

## 1. The four relevance invariants

1. **Fold, never hide.** Irrelevant elements go into the screen's "More" drawer, never away.
2. **Data always wins.** If the record in hand has a value for a field, the field renders.
3. **Fail open.** Profile loading, errored, or an unknown discipline → render everything.
4. **Explain yourself.** Adaptive decisions expose their reason and can be overruled.

Until the relevance registry exists (`docs/plans/ADAPTIVE_DISCIPLINES.md` in the API repo),
gate on the **selected aircraft** (class and `ulKind`) the way `showLaunchMethod` in
`src/components/flights/FlightForm.tsx` does — never on free-text substrings, never on a
guess about the user.

## 2. Questions for every rendered change

| # | Question | Typical failure |
| --- | --- | --- |
| F1 | Which personas see this? Is each one served by it? | Launch method shown for a TMG (K1) |
| F2 | Which personas see it without being served? It must fold for them. | IFR section in Sabine's form (S3); UL kinds in Mark's pickers (A1) |
| F3 | Can a persona lose sight of data they have? | Folding a field that has a value on this flight |
| F4 | Is the fastest path for the served persona fast? Count taps. | Six full forms for six winch circuits (L1) |
| F5 | Does the wording match the persona's world, in **both** en and de? | "Off-block" for a glider; "Recency" as a German noun; "schwerkraftgesteuert" instead of "gewichtskraftgesteuert" |
| F6 | Does quick-add / import leave the data the persona's currency needs? | Quick-added `D-M…` with no class or UL kind (M3) |
| F7 | Guards: is it unchanged for Mark, Anna and Ruth? | Screenshot diff on the airline fixture |

## 3. Screenshots per persona

The `screenshots` skill is mandatory for rendered changes; the persona check extends it.
Every persona has a fixture set in `scripts/screenshots/personas/<id>.mjs`, selected with
`--persona=<id>` or `SHOT_PERSONA=<id>` (ids `lena`, `jonas`, `karl`, `petra`, `mehmet`,
`sabine`, `mark`, `anna`, `ruth`, or `all`):

```bash
npm run shots -- before --persona=all --theme=light     # .screenshots/before/<persona>/…
npm run shots -- after  --persona=lena,karl,mark flights-modal-primary currency
```

- Capture the screen as **every persona the change touches, plus Mark** (the A2 guard: his
  before/after diff must be empty) and Ruth when it touches onboarding or empty states.
- `flights-modal-primary` / `-secondary` open the flight form with the persona's own aircraft
  selected (Lena `D-1234`, Karl `D-KOFA`, Petra `D-KXYZ` then the DR400 `D-EPTW`, Mehmet
  `D-MXYZ`, Sabine `D-MTRK` then the paramotor, Mark `D-AIUA` then the club C172, Anna the
  C172 then the ASK 21) — the aircraft-scope check for L3, K1, P1, M1, S3, A1.
- Each set serves `GET /users/me/pilot-profile` derived from the persona's records; a run
  prints `! pilot profile …` where the derivation disagrees with PERSONAS.md.
- Look at each: does Lena's form lead with launch method and take-off/landing? Does Mark's
  show nothing glider? Does Ruth's empty account show the full app?

## 4. Tests

- Name scenarios in test titles: `it('L3: glider aircraft shows launch method first')`.
- For every gated element, test both sides: shown for its persona, folded (not absent) for a
  guard, and **shown for the guard when the record has data** (invariant 2).
- Playwright scenarios that need the API follow the `testing` skill.

## 5. Report

End with one line per affected persona:

```
Personas: L3 closed (vitest + shots lena/after), K1 closed, A1 guard unchanged (shots mark),
S3 open — IFR still in Sabine's form until phase 3a.
```

For a full review, delegate to the `persona-reviewer` agent.
