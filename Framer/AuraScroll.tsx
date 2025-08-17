
import React, { useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle, useEffect } from 'react';
import { addPropertyControls, ControlType } from 'framer';

//================================================================
// CONFIGURATION
//================================================================
export interface SectionData {
  id: number;
  title: string;
  className: string;
  backgroundImage: string;
  backgroundPosition?: string;
  blurAmount?: string;
}

export const config = {
  sections: [
    {
      id: 1,
      title: 'Aura Scape',
      className: 'first',
      backgroundImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: 2,
      title: 'Serene Waters',
      className: 'second',
      backgroundImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop",
      blurAmount: '10px',
    },
    {
      id: 3,
      title: 'Mountain Pass',
      className: 'third',
      backgroundImage: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop",
    },
    {
      id: 4,
      title: 'Cascading Falls',
      className: 'fourth',
      backgroundImage: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1974&auto=format&fit=crop",
      blurAmount: '2px',
    },
    {
      id: 5,
      title: 'Verdant Hills',
      className: 'fifth',
      backgroundImage: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop",
      backgroundPosition: '50% 45%',
    },
  ] as SectionData[],

  animation: {
    defaultDuration: 1.25,
    defaultEase: "power1.inOut",
    textOutroDuration: 0.8,
    textOutroEase: "power2.in",
    textOutroYPercent: -150,
    textStagger: 0.02,
    textIntroDuration: 1,
    textIntroEase: "power2",
    textIntroYPercent: 150,
    imageOutroYPercent: -30,
    imageIntroYPercent: 30,
    imageBlurAmount: '5px',
    indicatorAnimDuration: 1,
    indicatorAnimEase: "power2",
    indicatorIntroDuration: 1,
    indicatorIntroEase: "power2.out",
    scrollTolerance: 10,
  },

  ui: {
    pageIndicatorDigitHeight: 20,
    headerHeight: '7em',
    pageIndicatorBottom: '7em',
  }
};

//================================================================
// GLOBAL STYLES & SCRIPT LOADER
//================================================================

const GlobalStyles = () => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Syne:wght@600&display=swap');
      
      .framer-1unq89k, .framer-1unq89k * { /* A common Framer root class, targeting this helps */
        font-family: 'Inter', sans-serif;
      }
      h2.section-heading {
        font-family: 'Syne', sans-serif;
      }
      .clip-text {
          overflow: hidden;
      }
      h2 * {
          will-change: transform;
      }
    `}</style>
);

const loadScript = (src: string, id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.head.appendChild(script);
    });
};

const useGsapScripts = (): boolean => {
    const [scriptsLoaded, setScriptsLoaded] = useState(false);

    useEffect(() => {
        const loadAllScripts = async () => {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', 'gsap-script');
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Observer.min.js', 'gsap-observer-script');
                await loadScript('https://unpkg.com/gsap@3/dist/SplitText.min.js', 'gsap-splittext-script');
                setScriptsLoaded(true);
            } catch (error) {
                console.error("Failed to load GSAP scripts:", error);
            }
        };
        loadAllScripts();
    }, []);

    return scriptsLoaded;
};

//================================================================
// GSAP TYPES & HOOKS
//================================================================
declare const gsap: any;
declare const Observer: any;
declare const SplitText: any;

interface PageIndicatorHandles {
  rootRef: React.RefObject<HTMLDivElement>;
  tensRef: React.RefObject<HTMLSpanElement>;
  unitsRef: React.RefObject<HTMLSpanElement>;
}

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
    if (typeof gsap === 'undefined' || typeof Observer === 'undefined' || typeof SplitText === 'undefined') {
      return;
    }
    
    let ctx = gsap.context(() => {
      const pageIndicatorHandles = pageIndicatorRef.current;
      if (!pageIndicatorHandles || !pageIndicatorHandles.rootRef.current) return;

      const sectionsDom = sectionRefs.current.filter(Boolean) as HTMLElement[];
      const imagesDom = imageRefs.current.filter(Boolean) as HTMLDivElement[];
      const headingsDom = headingRefs.current.filter(Boolean) as HTMLHeadingElement[];
      const outerWrappersDom = outerWrapperRefs.current.filter(Boolean) as HTMLDivElement[];
      const innerWrappersDom = innerWrapperRefs.current.filter(Boolean) as HTMLDivElement[];
      const animConfig = config.animation;

      let currentIndex = 0;
      setActiveIndex(0);
      let animating = false;
      
      const splitHeadings = headingsDom.map(heading => new SplitText(heading, { type: "chars,words,lines", linesClass: "clip-text" }));

      gsap.set(outerWrappersDom, { yPercent: 100 });
      gsap.set(innerWrappersDom, { yPercent: -100 });
      gsap.set(pageIndicatorHandles.rootRef.current, {autoAlpha: 0, y: -30});

      gsap.set(sectionsDom[0], { autoAlpha: 1, zIndex: 1 });
      gsap.set([outerWrappersDom[0], innerWrappersDom[0]], { yPercent: 0 });
      gsap.set(imagesDom[0], { yPercent: 0 });
      gsap.set(splitHeadings[0].chars, { autoAlpha: 1 });

      let digitHeight = config.ui.pageIndicatorDigitHeight;
      if (pageIndicatorHandles.unitsRef.current?.firstElementChild) {
        digitHeight = (pageIndicatorHandles.unitsRef.current.firstElementChild as HTMLElement).offsetHeight;
      }

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
              const currentSectionData = sections[currentIndex];
              const blurAmount = currentSectionData.blurAmount ?? animConfig.imageBlurAmount;
              gsap.set(sectionsDom[currentIndex], { zIndex: 0 });
              
              tl.to(splitHeadings[currentIndex].chars, {
                  autoAlpha: 0, yPercent: animConfig.textOutroYPercent * dFactor,
                  duration: animConfig.textOutroDuration, ease: animConfig.textOutroEase,
                  stagger: { each: animConfig.textStagger, from: "random" }
              }, 0);

              tl.to(imagesDom[currentIndex], { 
                  yPercent: animConfig.imageOutroYPercent * dFactor,
                  filter: `blur(${blurAmount})`
                }, 0)
                .set(sectionsDom[currentIndex], { autoAlpha: 0 });
          }

          const nextSectionData = sections[index];
          const blurAmount = nextSectionData.blurAmount ?? animConfig.imageBlurAmount;
          gsap.set(sectionsDom[index], { autoAlpha: 1, zIndex: 1 });
          
          tl.fromTo([outerWrappersDom[index], innerWrappersDom[index]], { 
              yPercent: i => i ? -100 * dFactor : 100 * dFactor
          }, { yPercent: 0 }, 0);

          tl.fromTo(imagesDom[index], { 
            yPercent: animConfig.imageIntroYPercent * dFactor, filter: `blur(${blurAmount})` 
          }, { yPercent: 0, filter: 'blur(0px)' }, 0);

          tl.fromTo(splitHeadings[index].chars, {
              autoAlpha: 0, yPercent: animConfig.textIntroYPercent * dFactor
          }, {
              autoAlpha: 1, yPercent: 0, duration: animConfig.textIntroDuration,
              ease: animConfig.textIntroEase, stagger: { each: animConfig.textStagger, from: "random" }
          }, 0.2);
          
          tl.to(pageIndicatorHandles.tensRef.current, { y: -nextTens * digitHeight, duration: animConfig.indicatorAnimDuration, ease: animConfig.indicatorAnimEase }, 0.2);
          tl.to(pageIndicatorHandles.unitsRef.current, { y: -nextUnits * digitHeight, duration: animConfig.indicatorAnimDuration, ease: animConfig.indicatorAnimEase }, 0.2);

          currentIndex = index;
      }
      
      gsap.to(pageIndicatorHandles.rootRef.current, { autoAlpha: 1, y: 0, duration: animConfig.indicatorIntroDuration, ease: animConfig.indicatorIntroEase });

      const observer = Observer.create({
          target: mainRef.current,
          type: "wheel,touch,pointer", wheelSpeed: -1,
          onDown: () => !animating && gotoSection(currentIndex - 1, -1),
          onUp: () => !animating && gotoSection(currentIndex + 1, 1),
          tolerance: animConfig.scrollTolerance, preventDefault: true
      });
      
      return () => {
        observer.kill();
      };
    }, mainRef);

    return () => ctx.revert();
  }, [sections, setActiveIndex, mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef]);
};

//================================================================
// COMPONENTS
//================================================================
const Header: React.FC = () => (
  <header 
    className="fixed top-0 left-0 flex items-center justify-between px-[5%] w-full z-30 text-[clamp(0.66rem,2vw,1rem)] tracking-[0.5em]"
    style={{ height: config.ui.headerHeight }}
  >
    <div id="site-logo" className="text-white no-underline font-semibold">AS</div>
  </header>
);

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

  useImperativeHandle(ref, () => ({ rootRef, tensRef, unitsRef }));

  return (
    <div 
      id="page-indicator" ref={rootRef} 
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

interface SectionProps {
  section: SectionData; index: number;
  setSectionRef: (el: HTMLElement | null, index: number) => void;
  setImageRef: (el: HTMLDivElement | null, index: number) => void;
  setHeadingRef: (el: HTMLHeadingElement | null, index: number) => void;
  setOuterWrapperRef: (el: HTMLDivElement | null, index: number) => void;
  setInnerWrapperRef: (el: HTMLDivElement | null, index: number) => void;
}

const Section: React.FC<SectionProps> = ({ section, index, setSectionRef, setImageRef, setHeadingRef, setOuterWrapperRef, setInnerWrapperRef }) => (
    <section ref={el => setSectionRef(el, index)} className="fixed top-0 h-full w-full invisible">
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

interface SectionListProps {
  sections: SectionData[];
  sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  imageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  headingRefs: React.MutableRefObject<(HTMLHeadingElement | null)[]>;
  outerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  innerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const SectionList: React.FC<SectionListProps> = ({ sections, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs }) => (
    <>
      {sections.map((section, index) => (
        <Section
          key={section.id} section={section} index={index}
          setSectionRef={(el, i) => sectionRefs.current[i] = el}
          setImageRef={(el, i) => imageRefs.current[i] = el}
          setHeadingRef={(el, i) => headingRefs.current[i] = el}
          setOuterWrapperRef={(el, i) => outerWrapperRefs.current[i] = el}
          setInnerWrapperRef={(el, i) => innerWrapperRefs.current[i] = el}
        />
      ))}
    </>
);

interface ScrollingSectionsProps {
  sections: SectionData[];
}

const ScrollingSections: React.FC<ScrollingSectionsProps> = ({ sections }) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const pageIndicatorRef = useRef<PageIndicatorHandles>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const outerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGsapAnimations({ mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef }, sections, setActiveIndex);

  return (
    <>
      <div ref={mainRef} className="h-full w-full">
        <SectionList
          sections={sections}
          sectionRefs={sectionRefs} imageRefs={imageRefs} headingRefs={headingRefs}
          outerWrapperRefs={outerWrapperRefs} innerWrapperRefs={innerWrapperRefs}
        />
      </div>
      <PageIndicator ref={pageIndicatorRef} />
    </>
  );
};

//================================================================
// FRAMER COMPONENT EXPORT
//================================================================
export default function AuraScroll(props) {
  const scriptsLoaded = useGsapScripts();

  if (!scriptsLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#111', color: 'white', fontFamily: 'sans-serif' }}>
        Loading Animations...
      </div>
    );
  }
  
  return (
    <div className="bg-black text-white uppercase h-full w-full overflow-hidden relative">
        <GlobalStyles />
        <Header />
        <ScrollingSections sections={config.sections} />
    </div>
  );
}

AuraScroll.defaultProps = {
    width: "100%",
    height: "100%",
};

addPropertyControls(AuraScroll, {
  // Property controls can be added here for Framer UI
});
