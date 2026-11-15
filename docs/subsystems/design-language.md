# Design language: what the system is going for

The intent behind the tokens and atoms: how Common Garden should *feel*, so a design session (a person, Claude Code, a design skill) makes the choices the numbers leave open. Feather's answers, 2026-11-15. The numbers live in the docs this page links to and are never restated here; where this page and a token disagree, the token is the fact and this page is the direction.

Read it before designing a page, screen or component for any door that pins cgos-ui. An artist's own door spends its own identity on top of this (feather.fm forks its tokens on purpose).

## The feeling: a cosmic garden

**Dark cosmos, with the garden as the splash of colour.** The ground is night (`--cg-bg`); light comes from the living things in it: the bloom accents, the petal stroke, glow. Common Garden is dark only. The light ("Day") theme in `tokens.css` exists for doors that choose it as their own world (Reliquary), not for cmngrdn.com or HQ.

**HQ is a living operating system.** Your one-stop control centre: visionOS and Apple in spirit. Simple, clean, minimal; holo meets glass meets organic. It breathes with what is changing across your world: new inquiries, a booking landing, a release going live. Calm until something is alive, then it shows.

**Panels are entities.** Every window, widget and app is a thing in space, not a region of a page. That is the direction this is built toward: an AR implementation, like visionOS, where any panel can be pulled out and placed in a working space. Design each panel so it would still make sense floating on its own: its own surface, its own header, sized rather than grown. [window-contract](window-contract.md), [surfaces](surfaces.md).

## Colour: the bloom

- **The bloom is the accent set: teal, orange, pink-magenta, cyan.** Not one accent but a few, like petals. They are the colour in a dark world, and they stay a splash: most of any screen is ground, text and glass.
- Today's nearest tokens: teal `--cg-accent`, orange `--cg-petal-orange`, magenta `--cg-petal-magenta` / pink `--cg-module-journey`, cyan `--cg-status-cyan`. *Proposed:* a named `--cg-bloom-*` set so the four are chosen once (an open token decision, not made yet).
- **Colours with a job keep it.** App, channel, artist and status colours are name tags ([tokens](tokens.md)); a bloom accent never stands in for one.
- **Show the stroke more.** The iridescent petal stroke (`--cg-iridescent`) and the brand gradient are the signature, and they should be seen: hairlines on glass edges, dividers, active and focus states, the mark, a hero's one moment. Still a line or a light, never a flat fill behind text or a button body.

## Form: thin, light, polished

- **Thin and minimal, never fat or blocky.** Light display weights (the marketing `.cg-text-hero` / `-display` are 300), hairline borders, fine icons, generous space.
- **Polished and real, never cartoonish.** Light behaves like light: a specular top rim on glass, soft glow, real blur and depth. No thick outlines, chunky shadows, flat toy colours or bubbly oversized shapes.
- **Glass, then fill, then pill; depth is spent once.** [surfaces](surfaces.md).
- **All-caps headings are a taste, not a law.** H1-type headings and section labels read as tracked capitals (cmngrdn does this globally); sentence case is for saying things. A surface may break it when it reads better. Type roles: [type-and-space](type-and-space.md).

## Motion: Apple-like, springy, fast

- **Light and lift.** On hover a panel or control rises toward you: a slight float, a gentle parallax tilt, a brighter rim and glow, as visionOS does with gaze. Things arrive like light coming up.
- **Press like a real button.** Much of HQ is a HUD of controls, so presses are springy and organic: a quick squeeze and a bounce back that you can feel. `spring.snappy` and `spring.bouncy` in `lib/motion`.
- **Fast and efficient.** Springs settle quickly; nothing makes you wait for it. Durations and easings: [tokens](tokens.md) § Motion scale.
- **Alive, not busy.** Ambient motion (a breathing stroke, a slow glow) marks what is live; everything else is still.
- **Reduced motion** drops travel, tilt and bounce, and keeps fades, colour and glow. Nothing stays hidden.

## Avoid

- Fat, blocky, cartoonish shapes and type; heavy weights at display size.
- A bright or light page ground on Common Garden's own surfaces.
- Colour as decoration; one surface wearing every bloom colour at once.
- Glass inside glass, or a panel that grows and pushes its neighbours.
- Generic purple-to-blue "AI" gradients and stock template looks.

## How a session uses this

1. Read this page for the feel, then [tokens](tokens.md), [type-and-space](type-and-space.md) and [surfaces](surfaces.md) for the numbers.
2. Build with the tokens and atoms, even in a mockup. No hex in style props, no raw `<button>` ([consumer-rules](consumer-rules.md)).
3. Where the design needs something the system lacks, propose it here as a token or atom rather than a one-off.
