# AuraScroll: A GSAP Scrolling Experience

This is a visually stunning single-page application that uses the GSAP (GreenSock Animation Platform) library to create smooth, full-page scrolling transitions between sections.

---

## What is this? (Explain Like I'm 5)

Imagine you have a deck of giant, beautiful photo cards.

You can only see the top card at any time. When you swipe up or down (or scroll your mouse), a magical hand swoops in, slides the top card away with a cool animated flourish, and reveals the next card underneath it.

This website is exactly that, but with web pages instead of physical cards.

### The Context Map for Dummies

Let's break down how the magic works using a simple map.

*   **The Cards (The "Sections"):**
    *   Each full-screen page with a big picture and a title is a "Section". They are all stacked on top of each other in the code, but we use animations to hide all but one at a time.
    *   *File responsible:* `components/Section.tsx`

*   **The Magical Hand (The Animation Logic):**
    *   The "magical hand" that does all the cool animations is a professional animation tool for the web called **GSAP**.
    *   The instructions we give to this magical hand are all written down in one place. This file is the "brain" of the entire animation. It listens for your scroll and tells all the elements when and how to move.
    *   *File responsible:* `hooks/useGsapAnimations.ts`

*   **The Person Holding the Cards (The Main Component):**
    *   This component is in charge. It holds all the "Section" cards, tells the "brain" which card to show, and also manages the little page number counter in the corner.
    *   *File responsible:* `components/ScrollingSections.tsx`

*   **The List of Pictures & Titles (The Data):**
    *   Instead of hard-coding the title and image URL on each "card," we keep a neat little list of all the content. This makes it super easy to change things!
    *   *File responsible:* `constants.ts` (in the original app) or `Code/config.ts` (in the configurable version).

### What are all these folders?

We have a few different versions of this app to make it easy to use in different ways.

*   **(Root Folder)`/`**: This is the **Original App**. It's a standard React app where all the parts are split into different files and folders. This is great for keeping a project organized.

*   `Code/`: This is the **"All-in-One" Version**.
    *   `FlattenedApp.tsx`: We took all the different parts from the original app and squished them into a single file. Sometimes it's easier to see everything at once this way.
    *   `config.ts`: This is the **master control panel** for the app. You can change almost anything here—text, images, animation speed, blur effects, etc.—without touching the main code.

*   `Framer/`: This is the **"Framer Component" Version**.
    *   `AuraScroll.tsx`: This is a special, self-contained package designed to be dropped right into a design and prototyping tool called [Framer](https://framer.com). It includes everything it needs to work, all in one file. Think of it like a portable, super-powered toy that you can bring to any playground and customize on the fly. You can control sections, transitions, and UI elements from the properties panel in Framer.

---

## How to Change Stuff (The Easy Way)

Want to customize the site? You only need to edit one file: **`Code/config.ts`**.

*   **To change the section titles or background images:**
    *   Open `Code/config.ts`.
    *   Look for the `sections` array.
    *   Just edit the `title` or `backgroundImage` for any section. You can add or remove sections here too!

*   **To change the animation speed or effects:**
    *   Open `Code/config.ts`.
    *   Look for the `animation` object.
    *   You can tweak values like `defaultDuration` (how long the animation takes) or `imageBlurAmount` (the default blurriness between transitions).

That's it! You don't need to be a code wizard to make it your own.
