import React, { useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle, useEffect } from "react"
import { Frame, addPropertyControls, ControlType } from "framer"

// GSAP types are not standard, so we declare them on the window object
declare const gsap: any
declare const Observer: any
declare const SplitText: any

//================================================================
// UTILITY HOOKS
//================================================================

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
        }

        const setStateFromEvent = (event: Event) => {
            setStatus(event.type === "load" ? "ready" : "error")
        }

        // If the script is already loaded, update status
        if (script.getAttribute("data-status") === "ready") {
             setStatus("ready")
        } else {
            script.addEventListener("load", setStateFromEvent)
            script.addEventListener("error", setStateFromEvent)
        }

        return () => {
            if (script) {
                script.removeEventListener("load", setStateFromEvent)
                script.removeEventListener("error", setStateFromEvent)
            }
        }
    }, [src])

    return status
}

const useInjectStyles = () => {
    useLayoutEffect(() => {
        const styleId = "aurascroll-styles"
        if (document.getElementById(styleId)) {
            return
        }

        const style = document.createElement("style")
        style.id = styleId
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Syne:wght@600&display=swap');
            
            .aurascroll-container {
                font-family: 'Inter', sans-serif;
                background-color: black;
                color: white;
                text-transform: uppercase;
                height: 100%;
                width: 100%;
                overflow: hidden;
            }
            .aurascroll-container .section-heading {
                font-family: 'Syne', sans-serif;
            }
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
// TYPES
//================================================================
interface SectionData {
    id?: number | string
    title: string
    backgroundImage: string
    backgroundPosition?: string
}

interface PageIndicatorHandles {
    rootRef: React.RefObject<HTMLDivElement>
    tensRef: React.RefObject<HTMLSpanElement>
    unitsRef: React.RefObject<HTMLSpanElement>
}

interface AuraScrollProps {
    sections: SectionData[]
    transitions: {
        duration: number
        ease: string
        blurAmount: number
        textStagger: number
    }
    ui: {
        showLogo: boolean
        showIndicator: boolean
        logoText: string
    }
    width: number,
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

const useGsapAnimations = (
    { mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef }: GsapAnimationRefs,
    sections: SectionData[],
    transitions: AuraScrollProps['transitions']
) => {

    useLayoutEffect(() => {
        let ctx: any

        const initAnimations = () => {
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

            let currentIndex = 0;
            let animating = false;
            
            ctx = gsap.context(() => {
                const splitHeadings = headingsDom.map(heading => new SplitText(heading, { type: "chars,words,lines", linesClass: "clip-text" }))

                gsap.set(outerWrappersDom, { yPercent: 100 })
                gsap.set(innerWrappersDom, { yPercent: -100 })
                gsap.set(pageIndicatorHandles.rootRef.current, {autoAlpha: 0, y: -30});

                gsap.set(sectionsDom[0], { autoAlpha: 1, zIndex: 1 })
                gsap.set([outerWrappersDom[0], innerWrappersDom[0]], { yPercent: 0 })
                gsap.set(imagesDom[0], { yPercent: 0 })
                gsap.set(splitHeadings[0].chars, { autoAlpha: 1 })

                let digitHeight = 20;
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
                        defaults: { duration: transitions.duration, ease: transitions.ease },
                        onComplete: () => { 
                            animating = false; 
                        }
                    });

                    if (currentIndex >= 0) {
                        gsap.set(sectionsDom[currentIndex], { zIndex: 0 });
                        
                        tl.to(splitHeadings[currentIndex].chars, {
                            autoAlpha: 0,
                            yPercent: -150 * dFactor,
                            duration: 0.8,
                            ease: "power2.in",
                            stagger: {
                                each: transitions.textStagger,
                                from: "random"
                            }
                        }, 0);

                        tl.to(imagesDom[currentIndex], { 
                            yPercent: -30 * dFactor,
                            filter: `blur(${transitions.blurAmount}px)`
                          }, 0)
                          .set(sectionsDom[currentIndex], { autoAlpha: 0 });
                    }

                    gsap.set(sectionsDom[index], { autoAlpha: 1, zIndex: 1 });
                    
                    tl.fromTo([outerWrappersDom[index], innerWrappersDom[index]], { 
                        yPercent: i => i ? -100 * dFactor : 100 * dFactor
                    }, {
                        yPercent: 0
                    }, 0);

                    tl.fromTo(imagesDom[index], { 
                      yPercent: 30 * dFactor,
                      filter: `blur(${transitions.blurAmount}px)` 
                    }, { 
                      yPercent: 0,
                      filter: 'blur(0px)'
                    }, 0);

                    tl.fromTo(splitHeadings[index].chars, {
                        autoAlpha: 0,
                        yPercent: 150 * dFactor
                    }, {
                        autoAlpha: 1,
                        yPercent: 0,
                        duration: 1,
                        ease: "power2",
                        stagger: {
                            each: transitions.textStagger,
                            from: "random"
                        }
                    }, 0.2);
                    
                    tl.to(pageIndicatorHandles.tensRef.current, { y: -nextTens * digitHeight, duration: 1, ease: "power2" }, 0.2);
                    tl.to(pageIndicatorHandles.unitsRef.current, { y: -nextUnits * digitHeight, duration: 1, ease: "power2" }, 0.2);

                    currentIndex = index;
                }
                
                gsap.to(pageIndicatorHandles.rootRef.current, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });

                const observer = Observer.create({
                    target: mainRef.current,
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
            }, mainRef);
        };

        const timeoutId = setTimeout(initAnimations, 100);

        return () => {
          clearTimeout(timeoutId);
          ctx && ctx.revert();
        }
    }, [sections, transitions, mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef]);

};

//================================================================
// CHILD COMPONENTS
//================================================================

const Header: React.FC<{ logoText: string }> = ({ logoText }) => (
    <header className="fixed top-0 left-0 flex items-center justify-between px-[5%] w-full z-30 h-[7em] text-[clamp(0.66rem,2vw,1rem)] tracking-[0.5em]">
        <div id="site-logo" className="text-white no-underline font-semibold">{logoText}</div>
    </header>
);

const DigitStrip: React.FC<{ digitRef: React.RefObject<HTMLSpanElement> }> = ({ digitRef }) => (
    <span ref={digitRef} className="inline-block">
        {[...Array(10)].map((_, i) => (
            <span key={i} className="block h-[20px] leading-[20px]">{i}</span>
        ))}
    </span>
);

const PageIndicator = forwardRef<PageIndicatorHandles, {}>((props, ref) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const tensRef = useRef<HTMLSpanElement>(null);
    const unitsRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({ rootRef, tensRef, unitsRef }));

    return (
        <div id="page-indicator" ref={rootRef} className="fixed right-[5%] bottom-[7em] z-30 text-[clamp(0.66rem,2vw,1rem)] tracking-[0.2em]">
            <span style={{ height: `20px` }} className="inline-block overflow-hidden align-top"><DigitStrip digitRef={tensRef} /></span>
            <span style={{ height: `20px` }} className="inline-block overflow-hidden align-top"><DigitStrip digitRef={unitsRef} /></span>
        </div>
    );
});
PageIndicator.displayName = 'PageIndicator';


interface SectionProps {
    section: SectionData;
    index: number;
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
                    <h2 ref={el => setHeadingRef(el, index)} className="section-heading text-[clamp(1rem,8vw,10rem)] font-semibold text-center w-[90vw] max-w-[1200px] normal-case z-20">
                        {section.title}
                    </h2>
                </div>
            </div>
        </div>
    </section>
);


//================================================================
// MAIN CONTENT COMPONENT
//================================================================
const AuraScrollContent: React.FC<AuraScrollProps> = ({ sections, transitions, ui }) => {
    const mainRef = useRef<HTMLDivElement>(null);
    const pageIndicatorRef = useRef<PageIndicatorHandles>(null);

    const sectionRefs = useRef<(HTMLElement | null)[]>([]);
    const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
    const outerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
    const innerWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

    useGsapAnimations({ mainRef, sectionRefs, imageRefs, headingRefs, outerWrapperRefs, innerWrapperRefs, pageIndicatorRef }, sections, transitions);

    return (
        <div className="aurascroll-container">
            {ui.showLogo && <Header logoText={ui.logoText} />}
            <div ref={mainRef}>
                {sections.map((section, index) => (
                    <Section
                        key={section.id || index}
                        section={section}
                        index={index}
                        setSectionRef={(el, i) => sectionRefs.current[i] = el}
                        setImageRef={(el, i) => imageRefs.current[i] = el}
                        setHeadingRef={(el, i) => headingRefs.current[i] = el}
                        setOuterWrapperRef={(el, i) => outerWrapperRefs.current[i] = el}
                        setInnerWrapperRef={(el, i) => innerWrapperRefs.current[i] = el}
                    />
                ))}
            </div>
            {ui.showIndicator && <PageIndicator ref={pageIndicatorRef} />}
        </div>
    );
};


//================================================================
// FRAMER EXPORT & CONTROLS
//================================================================

export function AuraScroll(props: AuraScrollProps) {
    const gsapStatus = useScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js");
    const observerStatus = useScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Observer.min.js");
    const splitTextStatus = useScript("https://unpkg.com/gsap@3/dist/SplitText.min.js");
    
    useInjectStyles();

    const allScriptsReady = gsapStatus === 'ready' && observerStatus === 'ready' && splitTextStatus === 'ready';
    
    return (
        <Frame width={props.width} height={props.height} background="transparent">
           {allScriptsReady ? (
               <AuraScrollContent {...props} />
           ) : (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white', backgroundColor: 'black', fontFamily: 'sans-serif' }}>
                   Loading Animation Libraries...
               </div>
           )}
        </Frame>
    );
}

AuraScroll.defaultProps = {
    width: 600,
    height: 800,
    sections: [
        { id: 1, title: 'Aura Scape', backgroundImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop" },
        { id: 2, title: 'Serene Waters', backgroundImage: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop" },
        { id: 3, title: 'Mountain Pass', backgroundImage: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2070&auto=format&fit=crop" },
    ],
    transitions: {
        duration: 1.25,
        ease: "power1.inOut",
        blurAmount: 5,
        textStagger: 0.02,
    },
    ui: {
        showLogo: true,
        showIndicator: true,
        logoText: "AS",
    },
};

addPropertyControls(AuraScroll, {
    sections: {
        type: ControlType.Array,
        title: "Sections",
        propertyControl: {
            type: ControlType.Object,
            properties: {
                title: { type: ControlType.String, defaultValue: "New Section" },
                backgroundImage: { type: ControlType.Image, defaultValue: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop" },
                backgroundPosition: { type: ControlType.String, defaultValue: "center" },
            },
        },
    },
    transitions: {
        type: ControlType.Object,
        title: "Transitions",
        properties: {
            duration: { type: ControlType.Number, title: "Duration", defaultValue: 1.25, min: 0.1, max: 5, step: 0.05, display: "slider" },
            ease: { type: ControlType.Enum, title: "Ease", options: ["power1.inOut", "power2.inOut", "power3.inOut", "expo.inOut", "circ.inOut", "back.inOut"], optionTitles: ["Power1", "Power2", "Power3", "Expo", "Circ", "Back"], defaultValue: "power1.inOut" },
            blurAmount: { type: ControlType.Number, title: "Blur (px)", defaultValue: 5, min: 0, max: 50, step: 1, display: "slider" },
            textStagger: { type: ControlType.Number, title: "Text Stagger", defaultValue: 0.02, min: 0, max: 0.1, step: 0.005, display: "slider" },
        },
    },
    ui: {
        type: ControlType.Object,
        title: "UI Elements",
        properties: {
            showLogo: { type: ControlType.Boolean, title: "Logo", defaultValue: true },
            logoText: { type: ControlType.String, title: "Logo Text", defaultValue: "AS", hidden: (props) => !props.ui.showLogo },
            showIndicator: { type: ControlType.Boolean, title: "Indicator", defaultValue: true },
        },
    },
});
