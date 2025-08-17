
import { useLayoutEffect } from 'react';
import type { SectionData } from '../types';
import type { PageIndicatorHandles } from '../components/PageIndicator';

// GSAP types are not standard, so we declare them on the window object
declare const gsap: any;
declare const Observer: any;
declare const SplitText: any;

interface GsapAnimationRefs {
  mainRef: React.RefObject<HTMLDivElement>;
  sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  imageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  headingRefs: React.MutableRefObject<(HTMLHeadingElement | null)[]>;
  outerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  innerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  pageIndicatorRef: React.RefObject<PageIndicatorHandles>;
}

export const useGsapAnimations = (
  { mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef }: GsapAnimationRefs,
  sections: SectionData[],
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>
) => {

  useLayoutEffect(() => {
    let ctx: any;

    const initAnimations = () => {
      if (typeof gsap === 'undefined' || typeof Observer === 'undefined' || typeof SplitText === 'undefined') {
        console.error('GSAP or its plugins are not loaded.');
        return;
      }
      
      const pageIndicatorHandles = pageIndicatorRef.current;
      if (!pageIndicatorHandles || !pageIndicatorHandles.rootRef.current) {
        return;
      }

      const sectionsDom = sectionRefs.current.filter(Boolean) as HTMLElement[];
      const imagesDom = imageRefs.current.filter(Boolean) as HTMLDivElement[];
      const headingsDom = headingRefs.current.filter(Boolean) as HTMLHeadingElement[];
      const outerWrappersDom = outerWrapperRefs.current.filter(Boolean) as HTMLDivElement[];
      const innerWrappersDom = innerWrapperRefs.current.filter(Boolean) as HTMLDivElement[];

      let currentIndex = 0;
      setActiveIndex(0);
      let animating = false;
      
      ctx = gsap.context(() => {
          const splitHeadings = headingsDom.map(heading => new SplitText(heading, { type: "chars,words,lines", linesClass: "clip-text" }));

          // Set initial state for all sections to be hidden
          gsap.set(outerWrappersDom, { yPercent: 100 });
          gsap.set(innerWrappersDom, { yPercent: -100 });
          gsap.set(pageIndicatorHandles.rootRef.current, {autoAlpha: 0, y: -30});

          // Set initial state for the FIRST section to be visible immediately
          gsap.set(sectionsDom[0], { autoAlpha: 1, zIndex: 1 });
          gsap.set([outerWrappersDom[0], innerWrappersDom[0]], { yPercent: 0 });
          gsap.set(imagesDom[0], { yPercent: 0 });
          gsap.set(splitHeadings[0].chars, { autoAlpha: 1 });

          let digitHeight = 20; // Fallback
          if (pageIndicatorHandles.unitsRef.current?.firstElementChild) {
            digitHeight = (pageIndicatorHandles.unitsRef.current.firstElementChild as HTMLElement).offsetHeight;
          }

          // Set initial page indicator number without animation
          const initialNumber = 1;
          const initialTens = Math.floor(initialNumber / 10);
          const initialUnits = initialNumber % 10;
          gsap.set(pageIndicatorHandles.tensRef.current, { y: -initialTens * digitHeight });
          gsap.set(pageIndicatorHandles.unitsRef.current, { y: -initialUnits * digitHeight });


          const gotoSection = (index: number, direction: number) => {
              index = gsap.utils.wrap(0, sectionsDom.length, index);
              
              animating = true;
              let fromTop = direction === -1;
              let dFactor = fromTop ? -1 : 1;

              const nextNumber = index + 1;
              const nextTens = Math.floor(nextNumber / 10);
              const nextUnits = nextNumber % 10;
              
              const tl = gsap.timeline({
                  defaults: { duration: 1.25, ease: "power1.inOut" },
                  onComplete: () => { 
                      animating = false; 
                      setActiveIndex(index);
                  }
              });

              if (currentIndex >= 0) {
                  gsap.set(sectionsDom[currentIndex], { zIndex: 0 });
                  
                  // Text outro animation
                  tl.to(splitHeadings[currentIndex].chars, {
                      autoAlpha: 0,
                      yPercent: -150 * dFactor,
                      duration: 0.8,
                      ease: "power2.in",
                      stagger: {
                          each: 0.02,
                          from: "random"
                      }
                  }, 0);

                  // Image outro animation (move and blur), then hide section
                  tl.to(imagesDom[currentIndex], { 
                      yPercent: -30 * dFactor,
                      filter: 'blur(5px)'
                    }, 0)
                    .set(sectionsDom[currentIndex], { autoAlpha: 0 });
              }

              gsap.set(sectionsDom[index], { autoAlpha: 1, zIndex: 1 });
              
              // Section wrapper intro
              tl.fromTo([outerWrappersDom[index], innerWrappersDom[index]], { 
                  yPercent: i => i ? -100 * dFactor : 100 * dFactor
              }, {
                  yPercent: 0
              }, 0);

              // Image intro (move and un-blur)
              tl.fromTo(imagesDom[index], { 
                yPercent: 30 * dFactor,
                filter: 'blur(5px)' 
              }, { 
                yPercent: 0,
                filter: 'blur(0px)'
              }, 0);

              // Text intro
              tl.fromTo(splitHeadings[index].chars, {
                  autoAlpha: 0,
                  yPercent: 150 * dFactor
              }, {
                  autoAlpha: 1,
                  yPercent: 0,
                  duration: 1,
                  ease: "power2",
                  stagger: {
                      each: 0.02,
                      from: "random"
                  }
              }, 0.2);
              
              // Page indicator animation
              tl.to(pageIndicatorHandles.tensRef.current, { y: -nextTens * digitHeight, duration: 1, ease: "power2" }, 0.2);
              tl.to(pageIndicatorHandles.unitsRef.current, { y: -nextUnits * digitHeight, duration: 1, ease: "power2" }, 0.2);

              currentIndex = index;
          }
          
          // Animate in ONLY the page indicator
          gsap.to(pageIndicatorHandles.rootRef.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });

          const observer = Observer.create({
              type: "wheel,touch,pointer",
              wheelSpeed: -1,
              onDown: () => !animating && gotoSection(currentIndex - 1, -1),
              onUp: () => !animating && gotoSection(currentIndex + 1, 1),
              tolerance: 10,
              preventDefault: true
          });
          
          return () => {
            observer.kill();
          };
      });
    };

    // A small timeout allows React to render the DOM elements before GSAP tries to access them.
    const timeoutId = setTimeout(initAnimations, 0);

    return () => {
      clearTimeout(timeoutId);
      ctx && ctx.revert();
    }
  }, [sections, setActiveIndex, mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef]);

};
