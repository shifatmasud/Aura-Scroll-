// AuraScroll.tsx
import React, { useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle, useEffect } from "react"
import { addPropertyControls, ControlType } from "framer"

// Declare GSAP plugins in the global scope for TypeScript
declare const gsap: any
declare const Observer: any
declare const SplitText: any

//================================================================
// UTILITY HOOKS
//================================================================

/**
 * A hook to dynamically load an external script.
 * @param src The source URL of the script to load.
 * @returns The loading status of the script: "loading", "ready", or "error".
 */
const useScript = (src: string) => {
    const [status, setStatus] = useState(src ? "loading" : "idle")

    useEffect(() => {
        if (!src) {
            setStatus("idle")
            return
        }

        let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)

        if (!script) {
            script = document.createElement("script")
            script.src = src
            script.async = true
            script.setAttribute("data-status", "loading")
            document.body.appendChild(script)

            const setAttributeFromEvent = (event: Event) => {
                script?.setAttribute(
                    "data-status",
                    event.type === "load" ? "ready" : "error"
                )
            }

            script.addEventListener("load", setAttributeFromEvent)
            script.addEventListener("error", setAttributeFromEvent)
        } else {
             setStatus(script.getAttribute("data-status") || "loading");
        }


        const setStateFromEvent = (event: Event) => {
            setStatus(event.type === "load" ? "ready" : "error")
        }
        
        script.addEventListener("load", setStateFromEvent)
        script.addEventListener("error", setStateFromEvent)


        return () => {
            if (script) {
                script.removeEventListener("load", setStateFromEvent)
                script.removeEventListener("error", setStateFromEvent)
            }
        }
    }, [src])

    return status
}

/**
 * A hook to inject required styles and Google Fonts into the document's head.
 * This ensures that the component's styling and typography work correctly.
 */
const useInjectHeadElements = () => {
    useLayoutEffect(() => {
        const fontLinkId = "aurascroll-google-fonts";
        if (document.getElementById(fontLinkId)) return;

        const preconnect1 = document.createElement("link");
        preconnect1.id = fontLinkId;
        preconnect1.rel = "preconnect";
        preconnect1.href = "https://fonts.googleapis.com";
        document.head.appendChild(preconnect1);

        const preconnect2 = document.createElement("link");
        preconnect2.rel = "preconnect";
        preconnect2.href = "https://fonts.gstatic.com";
        preconnect2.setAttribute("crossorigin", "");
        document.head.appendChild(preconnect2);

        const fontLink = document.createElement("link");
        fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Syne:wght@600&display=swap";
        fontLink.rel = "stylesheet";
        document.head.appendChild(fontLink);

        const styleId = "aurascroll-styles"
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style")
        style.id = styleId
        style.innerHTML = `
            .aurascroll-container .clip-text {
                overflow: hidden;
            }
            .aurascroll-container h2 * {
                will-change: transform;
            }
        `
        document.head.appendChild(style)
    }, [])
}


//================================================================
// TYPES & INTERFACES
//================================================================
/**
 * Defines the data structure for a single section.
 */
interface SectionData {
    id?: number | string
    title: string
    backgroundImage: string
    backgroundPosition?: string
}

/**
 * Defines the refs exposed by the PageIndicator component for GSAP animations.
 */
interface PageIndicatorHandles {
    rootRef: React.RefObject<HTMLDivElement>
    tensRef: React.RefObject<HTMLSpanElement>
    unitsRef: React.RefObject<HTMLSpanElement>
}

/**
 * Defines the complete set of props for the AuraScroll Framer component.
 */
interface AuraScrollProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    /** An array of section objects to display. */
    sections: SectionData[]
    /** Configuration for transition animations. */
    transitions: {
        duration: number
        ease: string
        blurAmount: number
        textStagger: number
        infiniteScroll: boolean
    }
    /** Configuration for UI elements like logo and indicator. */
    ui: {
        showLogo: boolean
        showIndicator: boolean
        headerHeight: string
        indicatorBottom: string
        logoFont: object
        indicatorFont: object
        headingFont: object
        digitHeight: number
    }
    /** The width of the component, controlled by Framer. */
    width: number,
    /** The height of the component, controlled by Framer. */
    height: number
}

//================================================================
// ANIMATION HOOK
//================================================================
interface GsapAnimationRefs {
    mainRef: React.RefObject<HTMLDivElement>
    sectionRefs: React.MutableRefObject<(HTMLElement | null)[]>
    imageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
    headingRefs: React.MutableRefObject<(HTMLHeadingElement | null)[]>
    outerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
    innerWrapperRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
    pageIndicatorRef: React.RefObject<PageIndicatorHandles>
}

/**
 * A custom hook to encapsulate all GSAP animation logic.
 * @param refs - Refs to all DOM elements that need to be animated.
 * @param sections - The array of section data.
 * @param transitions - The transition configuration object from props.
 * @param ui - The UI configuration object from props.
 */
const useGsapAnimations = (
    { mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef }: GsapAnimationRefs,
    sections: SectionData[],
    transitions: AuraScrollProps['transitions'],
    ui: AuraScrollProps['ui']
) => {

    useLayoutEffect(() => {
        // Use refs for state that must persist across observer creation/destruction
        // without causing re-renders. This fixes stale closure issues.
        const currentIndexRef = useRef(0);
        const animatingRef = useRef(false);

        let ctx: any;
        let observer: any = null;

        const init = () => {
            if (typeof gsap === 'undefined' || typeof Observer === 'undefined' || typeof SplitText === 'undefined') {
                return;
            }
            
            const pageIndicatorHandles = pageIndicatorRef.current;
            if (!pageIndicatorHandles || !pageIndicatorHandles.rootRef.current) {
                return;
            }

            const sectionsDom = sectionRefs.current.filter(Boolean) as HTMLElement[]
            const imagesDom = imageRefs.current.filter(Boolean) as HTMLDivElement[]
            const headingsDom = headingRefs.current.filter(Boolean) as HTMLHeadingElement[]
            const outerWrappersDom = outerWrapperRefs.current.filter(Boolean) as HTMLDivElement[]
            const innerWrappersDom = innerWrapperRefs.current.filter(Boolean) as HTMLDivElement[]
           
            if (sectionsDom.length === 0) return;
            
            ctx = gsap.context(() => {
                const splitHeadings = headingsDom.map(heading => new SplitText(heading, { type: "chars,words,lines", linesClass: "clip-text" }))

                // Common initial setup
                gsap.set(outerWrappersDom, { yPercent: 100 });
                gsap.set(innerWrapperRefs, { yPercent: -100 });
                gsap.set(pageIndicatorHandles.rootRef.current, {autoAlpha: 0, y: -30});

                gsap.set(sectionsDom[0], { autoAlpha: 1, zIndex: 1 });
                gsap.set([outerWrappersDom[0], innerWrappersDom[0]], { yPercent: 0 });
                gsap.set(imagesDom[0], { yPercent: 0 });
                if(splitHeadings[0]) {
                    gsap.set(splitHeadings[0].chars, { autoAlpha: 1 });
                }

                const digitHeight = ui.digitHeight;
                const initialNumber = 1;
                const initialTens = Math.floor(initialNumber / 10);
                const initialUnits = initialNumber % 10;
                gsap.set(pageIndicatorHandles.tensRef.current, { y: -initialTens * digitHeight });
                gsap.set(pageIndicatorHandles.unitsRef.current, { y: -initialUnits * digitHeight });

                // Animate in the page indicator
                gsap.to(pageIndicatorHandles.rootRef.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });

                const gotoSection = (index: number, direction: number) => {
                    animatingRef.current = true;
                    let fromTop = direction === -1;
                    let dFactor = fromTop ? -1 : 1;
                    const currentIdx = currentIndexRef.current;

                    const nextNumber = index + 1;
                    const nextTens = Math.floor(nextNumber / 10);
                    const nextUnits = nextNumber % 10;
                    
                    const tl = gsap.timeline({
                        defaults: { duration: transitions.duration, ease: transitions.ease },
                        onComplete: () => { animatingRef.current = false; }
                    });

                    if (currentIdx >= 0 && splitHeadings[currentIdx]) {
                        gsap.set(sectionsDom[currentIdx], { zIndex: 0 });
                        
                        tl.to(splitHeadings[currentIdx].chars, { autoAlpha: 0, yPercent: -150 * dFactor, duration: 0.8, ease: "power2.in", stagger: { each: transitions.textStagger, from: "random" }}, 0);
                        tl.to(imagesDom[currentIdx], { yPercent: -30 * dFactor, filter: `blur(${transitions.blurAmount}px)`}, 0).set(sectionsDom[currentIdx], { autoAlpha: 0 });
                    }

                    gsap.set(sectionsDom[index], { autoAlpha: 1, zIndex: 1 });
                    
                    tl.fromTo([outerWrappersDom[index], innerWrappersDom[index]], { yPercent: i => i ? -100 * dFactor : 100 * dFactor }, { yPercent: 0 }, 0);
                    tl.fromTo(imagesDom[index], { yPercent: 30 * dFactor, filter: `blur(${transitions.blurAmount}px)`}, { yPercent: 0, filter: 'blur(0px)'}, 0);

                    if (splitHeadings[index]) {
                      tl.fromTo(splitHeadings[index].chars, { autoAlpha: 0, yPercent: 150 * dFactor }, { autoAlpha: 1, yPercent: 0, duration: 1, ease: "power2", stagger: { each: transitions.textStagger, from: "random" }}, 0.2);
                    }
                    
                    tl.to(pageIndicatorHandles.tensRef.current, { y: -nextTens * digitHeight, duration: 1, ease: "power2" }, 0.2);
                    tl.to(pageIndicatorHandles.unitsRef.current, { y: -nextUnits * digitHeight, duration: 1, ease: "power2" }, 0.2);

                    currentIndexRef.current = index;
                }
                
                const killObserver = () => {
                    if (observer) {
                        observer.kill();
                        observer = null;
                    }
                };
                
                const createObserver = () => {
                    if (observer) return;
                    
                    observer = Observer.create({
                        target: mainRef.current,
                        type: "wheel,touch,pointer",
                        wheelSpeed: -1,
                        onDown: () => { // Scroll Up
                            if (animatingRef.current) return;
                            const newIndex = currentIndexRef.current - 1;
                            if (transitions.infiniteScroll) {
                                gotoSection(gsap.utils.wrap(0, sections.length, newIndex), -1);
                            } else {
                                if (newIndex >= 0) {
                                    gotoSection(newIndex, -1);
                                } else {
                                    killObserver();
                                }
                            }
                        },
                        onUp: () => { // Scroll Down
                            if (animatingRef.current) return;
                            const newIndex = currentIndexRef.current + 1;
                            if (transitions.infiniteScroll) {
                                gotoSection(gsap.utils.wrap(0, sections.length, newIndex), 1);
                            } else {
                                if (newIndex < sections.length) {
                                    gotoSection(newIndex, 1);
                                } else {
                                    killObserver();
                                }
                            }
                        },
                        tolerance: 10,
                        preventDefault: true
                    });
                };
                
                if (transitions.infiniteScroll) {
                    createObserver();
                } else {
                    const handleScroll = () => {
                        if (!mainRef.current || observer) return;
                        
                        const rect = mainRef.current.getBoundingClientRect();
                        const isCentered = rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2;

                        if (isCentered) {
                            createObserver();
                        }
                    };
                    
                    window.addEventListener('scroll', handleScroll, { passive: true });
                    handleScroll();
                    
                    const cleanup = () => {
                        window.removeEventListener('scroll', handleScroll);
                        killObserver();
                    };
                    return cleanup;
                }

            }, mainRef);
        };

        const timeoutId = setTimeout(init, 100);

        return () => {
          clearTimeout(timeoutId);
          if (observer) {
              observer.kill();
          }
          if(ctx) {
              ctx.revert();
          }
        }
    }, [sections, transitions, ui, mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef]);

};

//================================================================
// STYLES
//================================================================
const baseContainerStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    backgroundColor: "black",
    color: "white",
    textTransform: "uppercase",
    width: "100%",
    position: "relative",
};

const headerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: "5%",
    right: "5%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 30,
    color: "white",
    background: "transparent",
};

const logoStyle: React.CSSProperties = {
    background: "transparent",
    width: "auto",
    height: "auto",
};

const pageIndicatorStyle: React.CSSProperties = {
    position: "absolute",
    right: "5%",
    zIndex: 30,
    background: "transparent",
    display: "flex",
    width: "auto",
};

const digitContainerStyle: React.CSSProperties = {
    overflow: "hidden",
    background: "transparent",
    width: "auto",
};

const digitStripStyle: React.CSSProperties = {
    display: "inline-block",
    background: "transparent",
    width: "auto",
    height: "auto",
};

const digitStyle: React.CSSProperties = {
    display: "block",
    background: "transparent",
    width: "auto",
};

const sectionStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "100%",
    visibility: "hidden",
    background: "transparent",
};

const wrapperStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflowY: "hidden",
    background: "transparent",
};

const bgImageStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    height: "100%",
    width: "100%",
    top: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
};

const headingStyle: React.CSSProperties = {
    textAlign: "center",
    width: "90vw",
    maxWidth: "1200px",
    zIndex: 20,
    color: "white",
    background: "transparent",
    height: "auto",
};

//================================================================
// CHILD & CONTENT COMPONENTS
//================================================================

const Header: React.FC<{ uiConfig: AuraScrollProps["ui"] }> = ({ uiConfig }) => (
    <header style={{ ...headerStyle, height: uiConfig.headerHeight, ...uiConfig.logoFont }}>
        <div style={logoStyle}>AS</div>
    </header>
);

const DigitStrip: React.FC<{ digitRef: React.RefObject<any>; uiConfig: AuraScrollProps["ui"] }> = ({ digitRef, uiConfig }) => (
    <span ref={digitRef} style={digitStripStyle}>
        {[...Array(10)].map((_, i) => (
            <span key={i} style={{ ...digitStyle, height: `${uiConfig.digitHeight}px`, lineHeight: `${uiConfig.digitHeight}px` }}>{i}</span>
        ))}
    </span>
);

const PageIndicator = forwardRef<PageIndicatorHandles, { uiConfig: AuraScrollProps["ui"] }>(({ uiConfig }, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const tensRef = useRef<HTMLSpanElement>(null);
    const unitsRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({ rootRef, tensRef, unitsRef }));

    return (
        <div ref={rootRef} style={{ ...pageIndicatorStyle, bottom: uiConfig.indicatorBottom, height: `${uiConfig.digitHeight}px`, ...uiConfig.indicatorFont }}>
            <span style={{ ...digitContainerStyle, height: `${uiConfig.digitHeight}px` }}><DigitStrip digitRef={tensRef} uiConfig={uiConfig} /></span>
            <span style={{ ...digitContainerStyle, height: `${uiConfig.digitHeight}px` }}><DigitStrip digitRef={unitsRef} uiConfig={uiConfig} /></span>
        </div>
    );
});
PageIndicator.displayName = 'PageIndicator';

interface SectionProps {
    section: SectionData;
    index: number;
    uiConfig: AuraScrollProps["ui"];
    setSectionRef: (el: HTMLElement | null, index: number) => void;
    setImageRef: (el: HTMLDivElement | null, index: number) => void;
    setHeadingRef: (el: HTMLHeadingElement | null, index: number) => void;
    setOuterWrapperRef: (el: HTMLDivElement | null, index: number) => void;
    setInnerWrapperRef: (el: HTMLDivElement | null, index: number) => void;
}
const Section: React.FC<SectionProps> = ({ section, index, uiConfig, setSectionRef, setImageRef, setHeadingRef, setOuterWrapperRef, setInnerWrapperRef }) => (
    <section ref={el => setSectionRef(el, index)} style={sectionStyle}>
        <div ref={el => setOuterWrapperRef(el, index)} style={wrapperStyle}>
            <div ref={el => setInnerWrapperRef(el, index)} style={wrapperStyle}>
                <div
                    ref={el => setImageRef(el, index)}
                    style={{
                        ...bgImageStyle,
                        backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.1) 100%), url("${section.backgroundImage}")`,
                        backgroundPosition: section.backgroundPosition || 'center'
                    }}
                >
                    <h2 ref={el => setHeadingRef(el, index)} style={{ ...headingStyle, ...uiConfig.headingFont }}>
                        {section.title}
                    </h2>
                </div>
            </div>
        </div>
    </section>
);

const AuraScrollContent: React.FC<AuraScrollProps> = ({ sections, transitions, ui }) => {
    const mainRef = useRef<HTMLDivElement>(null);
    const pageIndicatorRef = useRef<PageIndicatorHandles>(null);

    const sectionRefs = useRef<(HTMLElement | null)[]>([]);
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
    const outerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
    const innerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

    useGsapAnimations({ mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef }, sections, transitions, ui);

    const dynamicContainerStyle: React.CSSProperties = {
        ...baseContainerStyle,
        overflow: transitions.infiniteScroll ? "hidden" : "visible",
        height: "100%",
    };

    return (
        <div ref={mainRef} className="aurascroll-container" style={dynamicContainerStyle}>
            {ui.showLogo && <Header uiConfig={ui} />}
            {sections.map((section, index) => (
                <Section
                    key={section.id || index}
                    section={section}
                    index={index}
                    uiConfig={ui}
                    setSectionRef={(el, i) => sectionRefs.current[i] = el}
                    setImageRef={(el, i) => imageRefs.current[i] = el}
                    setHeadingRef={(el, i) => headingRefs.current[i] = el}
                    setOuterWrapperRef={(el, i) => outerWrapperRefs.current[i] = el}
                    setInnerWrapperRef={(el, i) => innerWrapperRefs.current[i] = el}
                />
            ))}
            {ui.showIndicator && <PageIndicator ref={pageIndicatorRef} uiConfig={ui} />}
        </div>
    );
};


//================================================================
// FRAMER EXPORT, CONTROLS & DEFAULTS
//================================================================
addPropertyControls(AuraScroll, {
    sections: {
        type: ControlType.Array,
        title: "Sections",
        control: {
            type: ControlType.Object,
            controls: {
                title: { type: ControlType.String, defaultValue: "New Section" },
                backgroundImage: { type: ControlType.Image },
                backgroundPosition: { type: ControlType.String, defaultValue: "center" },
            },
        },
    },
    transitions: {
        type: ControlType.Object,
        title: "Transitions",
        controls: {
            duration: { type: ControlType.Number, title: "Duration", defaultValue: 1.25, min: 0.1, max: 5, step: 0.05, description: "The duration of the animation between sections." },
            ease: { type: ControlType.Enum, title: "Ease", options: ["power1.inOut", "power2.inOut", "power3.inOut", "expo.inOut", "circ.inOut", "back.inOut"], optionTitles: ["Power1", "Power2", "Power3", "Expo", "Circ", "Back"], defaultValue: "power1.inOut" },
            blurAmount: { type: ControlType.Number, title: "Blur (px)", defaultValue: 5, min: 0, max: 50, step: 1 },
            textStagger: { type: ControlType.Number, title: "Text Stagger", defaultValue: 0.02, min: 0, max: 0.1, step: 0.005 },
            infiniteScroll: { type: ControlType.Boolean, title: "Infinite Scroll", defaultValue: true, description: "ON: Full-page takeover. OFF: Scrolls through sections once, then allows native page scroll." },
        },
    },
    ui: {
        type: ControlType.Object,
        title: "UI & Layout",
        controls: {
            showLogo: { type: ControlType.Boolean, title: "Show Logo", defaultValue: true },
            showIndicator: { type: ControlType.Boolean, title: "Show Indicator", defaultValue: true },
            headerHeight: { type: ControlType.String, title: "Header Height", defaultValue: "7em", placeholder: "e.g., 7em or 100px" },
            indicatorBottom: { type: ControlType.String, title: "Indicator Bottom", defaultValue: "7em", placeholder: "e.g., 7em or 100px" },
            logoFont: { type: ControlType.Font, title: "Logo Font", controls: "extended" },
            indicatorFont: { type: ControlType.Font, title: "Indicator Font", controls: "extended" },
            headingFont: { type: ControlType.Font, title: "Heading Font", controls: "extended" },
            digitHeight: { type: ControlType.Number, title: "Digit Height (px)", defaultValue: 20, min: 10, max: 50, step: 1 },
        },
    },
});

AuraScroll.defaultProps = {
    width: "100%",
    height: "100%",
    sections: [
        { id: 1, title: 'Aura Scape', backgroundImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto.format&fit=crop" },
        { id: 2, title: 'Serene Waters', backgroundImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto.format&fit=crop" },
        { id: 3, title: 'Mountain Pass', backgroundImage: "https://images.unsplash.com/photo-1470770841_072-f978cf4d019e?q=80&w=2070&auto.format&fit=crop" },
    ],
    transitions: {
        duration: 1.25,
        ease: "power1.inOut",
        blurAmount: 5,
        textStagger: 0.02,
        infiniteScroll: true,
    },
    ui: {
        showLogo: true,
        showIndicator: true,
        headerHeight: "7em",
        indicatorBottom: "7em",
        logoFont: {
            fontFamily: "'Inter', sans-serif",
            fontWeight: "600",
            fontSize: "clamp(0.66rem, 2vw, 1rem)",
            letterSpacing: "0.5em"
        },
        indicatorFont: {
            fontFamily: "'Inter', sans-serif",
            fontSize: "clamp(0.66rem, 2vw, 1rem)",
            letterSpacing: "0.2em"
        },
        headingFont: {
            fontFamily: "'Syne', sans-serif",
            fontWeight: "600",
            fontSize: "clamp(1rem, 8vw, 10rem)",
            textTransform: "none",
        },
        digitHeight: 20,
    },
};

/**
 * AuraScroll is a Framer component for creating immersive, full-page scrolling experiences.
 * It uses GSAP to animate transitions between sections with customizable text and image effects.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 */
export default function AuraScroll(props: AuraScrollProps) {
    const { sections, transitions, ui, width, height, style, ...rest } = props;
    
    const gsapStatus = useScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
    const observerStatus = useScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Observer.min.js");
    const splitTextStatus = useScript("https://unpkg.com/gsap@3/dist/SplitText.min.js");
    
    useInjectHeadElements();

    const allScriptsReady = gsapStatus === 'ready' && observerStatus === 'ready' && splitTextStatus === 'ready';
    
    return (
        <div style={{ width, height, background: "transparent", ...style }} {...rest}>
           {allScriptsReady ? (
               <AuraScrollContent {...props} />
           ) : (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', backgroundColor: 'black', fontFamily: 'sans-serif' }}>
                   Loading Animation Libraries...
               </div>
           )}
        </div>
    );
}
