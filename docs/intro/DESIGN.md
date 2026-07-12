---
name: X-FRONTEND
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#009eb9'
  on-tertiary-container: '#002f38'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-xl:
    fontFamily: JetBrains Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system embodies the persona of a high-tier "Full-stack AI" developer: precise, technical, yet visionary. The aesthetic leans heavily into **Futuristic Minimalism** mixed with **Glassmorphism**. The interface should feel like a sophisticated IDE or a mission-control dashboard for neural networks.

The target audience is fellow developers, AI researchers, and tech recruiters. The UI evokes a sense of deep-space exploration and digital precision through the use of obsidian surfaces, subtle light-leaks, and mathematical grid overlays. To maintain accessibility, the "geeky" elements are balanced with generous whitespace and clear information hierarchy.

## Colors

The palette is optimized for high-performance OLED displays and long-form technical reading. 

- **The Void (Background):** A deep, near-black base to minimize eye strain and maximize the contrast of "glowing" elements.
- **Synthetics (Accents):** AI Blue and Neural Purple are used as primary drivers for action and state. Cyan is reserved for tertiary accents like data visualizations or code highlighting.
- **Glass Surfaces:** Containers use semi-transparent variants of the surface color to create a sense of depth and layered complexity.
- **Glows:** Neon colors should be used with `drop-shadow` or `box-shadow` to simulate light emission from interactive components.

## Typography

The typography system creates a "Terminal-meets-Modern-Web" hierarchy. 

**JetBrains Mono** is utilized for all structural and data-driven elements (Headlines, Labels, Buttons, and Code). This reinforces the developer identity. It should be typeset with slightly tighter letter-spacing for headlines to maintain a modern look.

**Inter** is the workhorse for long-form content. Its neutral, humanist qualities balance the technicality of the monospace headers, ensuring that technical blog posts remain readable and approachable.

**Styling Note:** For H1 and H2 elements, consider a "flicker" entrance animation or a subtle gradient fill from Primary to Secondary colors to emphasize the high-tech theme.

## Layout & Spacing

This design system uses a **Fluid Grid** model with a hard 4px baseline rhythm. 

- **Grid:** A 12-column layout for desktop, transitioning to 4 columns for mobile.
- **Overlays:** A subtle, fixed background grid (1px lines, 5% opacity) should be visible across the entire viewport to give a "blueprint" feel.
- **Safe Zones:** Content containers should never touch the edge of the viewport; use consistent margins.
- **Sectioning:** Large vertical gaps (stack-lg or stack-xl) should separate distinct topics, mirroring the modularity of software components.

## Elevation & Depth

Hierarchy is established through **Light and Transparency** rather than traditional shadows.

- **Background:** Level 0 (#05070A). The solid foundation.
- **Surface (Glass):** Level 1. 60% opacity surface color with a 12px `backdrop-filter: blur()`. Edges are defined by a 1px border at 10% white opacity.
- **Active Elevation:** When an element is hovered, the border brightness increases, and a subtle outer glow using the Primary color (15% opacity) is applied.
- **Neural Connections:** Use thin, 1px svg paths to connect related cards or sections, mimicking a node-based architecture.

## Shapes

The shape language is **Precision-Focused**. 

While modern web design often trends toward fully rounded corners, this system uses a subtle **0.25rem (Soft)** radius. This maintains a sharp, technical "hardware" feel while avoiding the harshness of a pure 0px edge.

- **Action Elements:** Buttons and Inputs follow the standard 4px (Soft) radius.
- **System Indicators:** Status chips and small badges may use the "Pill" shape to distinguish them from structural containers.

## Components

### Buttons
Primary buttons use a solid Primary Blue background with a slight glow on hover. Secondary buttons are "Ghost" style with a Primary border and Mono text. Use `text-transform: uppercase` for all button labels.

### Cards
Cards are the primary container for blog previews and projects. Use the Glassmorphism style: semi-transparent background, blurred backdrop, and a subtle 1px border. On hover, the border color should transition to the Neural Purple.

### Code Blocks
The centerpiece of the brand. Use a darker obsidian background than the surface color. Syntactic highlighting should strictly follow the Primary, Secondary, and Tertiary color palette. Header bars for code blocks should display the file name and language in `label-caps`.

### Inputs
Text fields are dark-filled with a bottom-border only, or a very thin 1px outline. When focused, the border glows Blue and the label (using JetBrains Mono) floats above the field.

### Status Indicators
For "API Status" or "Live Now" elements, use a pulsing dot animation with the Success green. The pulse should have two rings of decreasing opacity.

### Neural Patterns
Background elements should include abstract SVG "nodes" (small circles) connected by thin, dim lines. These should be non-interactive and fixed-position to add texture without distracting from content.