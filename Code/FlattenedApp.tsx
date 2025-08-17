
import React, { useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom/client';
import { config, SectionData } from './config';

// GSAP types are not standard, so we declare them on the window object
declare const gsap: any;
declare const Observer: any;
declare const SplitText: any;

//================================================================
// TYPES
//================================================================
interface PageIndicatorHandles {
  rootRef: React.RefObject<HTMLDivElement>;
  tensRef: React.RefObject<HTMLSpanElement>;
  unitsRef: React.RefObject<HTMLSpanElement>;
}

//================================================================
// HOOKS
//================================================================
interface GsapAnimationRefs {
  mainRef: React.RefObject<HTMLDivElement>;
  sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  imageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  headingRefs: React.MutableRefObject<(HTMLHeadingElement | null)[]>;
  outerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  innerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  pageIndicatorRef: React.RefObject<PageIndicatorHandles>;
}

const useGsapAnimations = (
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
      const animConfig = config.animation;

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

          let digitHeight = config.ui.pageIndicatorDigitHeight;
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
                  defaults: { duration: animConfig.defaultDuration, ease: animConfig.defaultEase },
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
                      yPercent: animConfig.textOutroYPercent * dFactor,
                      duration: animConfig.textOutroDuration,
                      ease: animConfig.textOutroEase,
                      stagger: {
                          each: animConfig.textStagger,
                          from: "random"
                      }
                  }, 0);

                  // Image outro animation (move and blur), then hide section
                  tl.to(imagesDom[currentIndex], { 
                      yPercent: animConfig.imageOutroYPercent * dFactor,
                      filter: `blur(${animConfig.imageBlurAmount})`
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
                yPercent: animConfig.imageIntroYPercent * dFactor,
                filter: `blur(${animConfig.imageBlurAmount})` 
              }, { 
                yPercent: 0,
                filter: 'blur(0px)'
              }, 0);

              // Text intro
              tl.fromTo(splitHeadings[index].chars, {
                  autoAlpha: 0,
                  yPercent: animConfig.textIntroYPercent * dFactor
              }, {
                  autoAlpha: 1,
                  yPercent: 0,
                  duration: animConfig.textIntroDuration,
                  ease: animConfig.textIntroEase,
                  stagger: {
                      each: animConfig.textStagger,
                      from: "random"
                  }
              }, 0.2);
              
              // Page indicator animation
              tl.to(pageIndicatorHandles.tensRef.current, { y: -nextTens * digitHeight, duration: animConfig.indicatorAnimDuration, ease: animConfig.indicatorAnimEase }, 0.2);
              tl.to(pageIndicatorHandles.unitsRef.current, { y: -nextUnits * digitHeight, duration: animConfig.indicatorAnimDuration, ease: animConfig.indicatorAnimEase }, 0.2);

              currentIndex = index;
          }
          
          // Animate in ONLY the page indicator
          gsap.to(pageIndicatorHandles.rootRef.current, { autoAlpha: 1, y: 0, duration: animConfig.indicatorIntroDuration, ease: animConfig.indicatorIntroEase });

          const observer = Observer.create({
              type: "wheel,touch,pointer",
              wheelSpeed: -1,
              onDown: () => !animating && gotoSection(currentIndex - 1, -1),
              onUp: () => !animating && gotoSection(currentIndex + 1, 1),
              tolerance: animConfig.scrollTolerance,
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


//================================================================
// COMPONENTS
//================================================================

// --- Header ---
const Header: React.FC = () => {
  return (
    <header 
      className="fixed top-0 left-0 flex items-center justify-between px-[5%] w-full z-30 text-[clamp(0.66rem,2vw,1rem)] tracking-[0.5em]"
      style={{ height: config.ui.headerHeight }}
    >
      <div
        id="site-logo"
        className="text-white no-underline font-semibold"
      >
        AS
      </div>
    </header>
  );
};

// --- PageIndicator ---
const DigitStrip: React.FC<{ digitRef: React.RefObject<HTMLSpanElement> }> = ({ digitRef }) => (
  <span ref={digitRef} className="inline-block">
    {[...Array(10)].map((_, i) => (
      <span key={i} className="block leading-[20px]" style={{ height: `${config.ui.pageIndicatorDigitHeight}px`}}>{i}</span>
    ))}
  </span>
);

const PageIndicator = forwardRef<PageIndicatorHandles, {}>((props, ref) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const tensRef = useRef<HTMLSpanElement>(null);
  const unitsRef = useRef<HTMLSpanElement>(null);
  const digitHeight = config.ui.pageIndicatorDigitHeight;

  useImperativeHandle(ref, () => ({
    rootRef,
    tensRef,
    unitsRef,
  }));

  return (
    <div 
      id="page-indicator" 
      ref={rootRef} 
      className="fixed right-[5%] z-30 text-[clamp(0.66rem,2vw,1rem)] tracking-[0.2em]"
      style={{ bottom: config.ui.pageIndicatorBottom }}
    >
      <span style={{ height: `${digitHeight}px` }} className="inline-block overflow-hidden align-top">
        <DigitStrip digitRef={tensRef} />
      </span>
      <span style={{ height: `${digitHeight}px` }} className="inline-block overflow-hidden align-top">
        <DigitStrip digitRef={unitsRef} />
      </span>
    </div>
  );
});
PageIndicator.displayName = 'PageIndicator';

// --- Section ---
interface SectionProps {
  section: SectionData;
  index: number;
  setSectionRef: (el: HTMLElement | null, index: number) => void;
  setImageRef: (el: HTMLDivElement | null, index: number) => void;
  setHeadingRef: (el: HTMLHeadingElement | null, index: number) => void;
  setOuterWrapperRef: (el: HTMLDivElement | null, index: number) => void;
  setInnerWrapperRef: (el: HTMLDivElement | null, index: number) => void;
}

const Section: React.FC<SectionProps> = ({
  section,
  index,
  setSectionRef,
  setImageRef,
  setHeadingRef,
  setOuterWrapperRef,
  setInnerWrapperRef,
}) => {
  return (
    <section
      ref={el => setSectionRef(el, index)}
      className="fixed top-0 h-full w-full invisible"
    >
      <div ref={el => setOuterWrapperRef(el, index)} className="w-full h-full overflow-y-hidden">
        <div ref={el => setInnerWrapperRef(el, index)} className="w-full h-full overflow-y-hidden">
          <div
            ref={el => setImageRef(el, index)}
            className="bg flex items-center justify-center absolute h-full w-full top-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.1) 100%), url("${section.backgroundImage}")`,
              backgroundPosition: section.backgroundPosition || 'center'
            }}
          >
            <h2
              ref={el => setHeadingRef(el, index)}
              className="section-heading text-[clamp(1rem,8vw,10rem)] font-semibold text-center w-[90vw] max-w-[1200px] normal-case z-20"
            >
              {section.title}
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- SectionList ---
interface SectionListProps {
  sections: SectionData[];
  sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  imageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  headingRefs: React.MutableRefObject<(HTMLHeadingElement | null)[]>;
  outerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  innerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const SectionList: React.FC<SectionListProps> = ({
  sections,
  sectionRefs,
  imageRefs,
  headingRefs,
  outerWrapperRefs,
  innerWrapperRefs,
}) => {
  return (
    <>
      {sections.map((section, index) => (
        <Section
          key={section.id}
          section={section}
          index={index}
          setSectionRef={(el, i) => sectionRefs.current[i] = el}
          setImageRef={(el, i) => imageRefs.current[i] = el}
          setHeadingRef={(el, i) => headingRefs.current[i] = el}
          setOuterWrapperRef={(el, i) => outerWrapperRefs.current[i] = el}
          setInnerWrapperRef={(el, i) => innerWrapperRefs.current[i] = el}
        />
      ))}
    </>
  );
};

// --- ScrollingSections ---
interface ScrollingSectionsProps {
  sections: SectionData[];
}

const ScrollingSections: React.FC<ScrollingSectionsProps> = ({ sections }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const pageIndicatorRef = useRef<PageIndicatorHandles>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Initialize refs for all DOM elements that will be animated
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const outerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Use the custom hook for GSAP animations
  useGsapAnimations({
    mainRef,
    sectionRefs,
    imageRefs,
    headingRefs,
    outerWrapperRefs,
    innerWrapperRefs,
    pageIndicatorRef,
  }, sections, setActiveIndex);

  return (
    <>
      <div ref={mainRef}>
        <SectionList
          sections={sections}
          sectionRefs={sectionRefs}
          imageRefs={imageRefs}
          headingRefs={headingRefs}
          outerWrapperRefs={outerWrapperRefs}
          innerWrapperRefs={innerWrapperRefs}
        />
      </div>
      <PageIndicator ref={pageIndicatorRef} />
    </>
  );
};

// --- App ---
const App: React.FC = () => {
  return (
    <div className="bg-black text-white uppercase h-screen overflow-hidden">
      <Header />
      <ScrollingSections sections={config.sections} />
    </div>
  );
};


//================================================================
// RENDER
//================================================================
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
