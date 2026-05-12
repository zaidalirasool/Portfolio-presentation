import{r as c,j as o}from"./jsx-runtime-CIVZzHFC.js";import{G as E,u as N,C as K,T as W,a as U,P as V,t as J,r as Y,b as Z}from"./ResourcePickerRadio-D8ljYMlS.js";import{E as X}from"./chunk-VMD3UMGK-DiwEFlx_.js";import{T as ee,a as te,S as q,h as L,Q as re,n as v,m as $,M as se,b as O,c as x,e as oe,d as ne,f as ae,g as ie,o as T,r as R,i as le,j as A,p as F,s as ue,k as ce,l as fe,C as de,q as he,R as pe}from"./CookieProvider-BVJAZACW.js";import{u as _,a as me,O as ye}from"./index-XheLFRAl.js";import{f as ge,_ as be,h as ve,M as we,L as xe,S as ke}from"./components-DqM5YO-H.js";import{C as Se,R as Ce}from"./AdminProvider-DuqmYnD5.js";import{s as Pe}from"./userStore-PkNujeI1.js";import{u as je}from"./index-CinZ2_nc.js";import"./index-DKkzYQc5.js";import"./DisplayError-AdqNTsdX.js";import"./PageContainer-DeAOW91s.js";import"./Link-C517Ve1O.js";import"./router-B5iohslS.js";import"./admin-DYsjKyl4.js";import"./types-DpzpVF6n.js";import"./vanilla-DsuHaqMa.js";/**
 * @remix-run/react v2.16.8
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let Q="positions";function Me({getKey:e,...t}){let{isSpaMode:r}=ge(),s=_(),n=me();je({getKey:e,storageKey:Q});let a=c.useMemo(()=>{if(!e)return null;let l=e(s,n);return l!==s.key?l:null},[]);if(r)return null;let i=((l,f)=>{if(!window.history.state||!window.history.state.key){let u=Math.random().toString(32).slice(2);window.history.replaceState({key:u},"")}try{let y=JSON.parse(sessionStorage.getItem(l)||"{}")[f||window.history.state.key];typeof y=="number"&&window.scrollTo(0,y)}catch(u){console.error(u),sessionStorage.removeItem(l)}}).toString();return c.createElement("script",be({},t,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${i})(${JSON.stringify(Q)}, ${JSON.stringify(a)})`}}))}var I=String.raw,H=I`
  :root,
  :host {
    --chakra-vh: 100vh;
  }

  @supports (height: -webkit-fill-available) {
    :root,
    :host {
      --chakra-vh: -webkit-fill-available;
    }
  }

  @supports (height: -moz-fill-available) {
    :root,
    :host {
      --chakra-vh: -moz-fill-available;
    }
  }

  @supports (height: 100dvh) {
    :root,
    :host {
      --chakra-vh: 100dvh;
    }
  }
`,Ee=()=>o.jsx(E,{styles:H}),$e=({scope:e=""})=>o.jsx(E,{styles:I`
      html {
        line-height: 1.5;
        -webkit-text-size-adjust: 100%;
        font-family: system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        -moz-osx-font-smoothing: grayscale;
        touch-action: manipulation;
      }

      body {
        position: relative;
        min-height: 100%;
        margin: 0;
        font-feature-settings: "kern";
      }

      ${e} :where(*, *::before, *::after) {
        border-width: 0;
        border-style: solid;
        box-sizing: border-box;
        word-wrap: break-word;
      }

      main {
        display: block;
      }

      ${e} hr {
        border-top-width: 1px;
        box-sizing: content-box;
        height: 0;
        overflow: visible;
      }

      ${e} :where(pre, code, kbd,samp) {
        font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 1em;
      }

      ${e} a {
        background-color: transparent;
        color: inherit;
        text-decoration: inherit;
      }

      ${e} abbr[title] {
        border-bottom: none;
        text-decoration: underline;
        -webkit-text-decoration: underline dotted;
        text-decoration: underline dotted;
      }

      ${e} :where(b, strong) {
        font-weight: bold;
      }

      ${e} small {
        font-size: 80%;
      }

      ${e} :where(sub,sup) {
        font-size: 75%;
        line-height: 0;
        position: relative;
        vertical-align: baseline;
      }

      ${e} sub {
        bottom: -0.25em;
      }

      ${e} sup {
        top: -0.5em;
      }

      ${e} img {
        border-style: none;
      }

      ${e} :where(button, input, optgroup, select, textarea) {
        font-family: inherit;
        font-size: 100%;
        line-height: 1.15;
        margin: 0;
      }

      ${e} :where(button, input) {
        overflow: visible;
      }

      ${e} :where(button, select) {
        text-transform: none;
      }

      ${e} :where(
          button::-moz-focus-inner,
          [type="button"]::-moz-focus-inner,
          [type="reset"]::-moz-focus-inner,
          [type="submit"]::-moz-focus-inner
        ) {
        border-style: none;
        padding: 0;
      }

      ${e} fieldset {
        padding: 0.35em 0.75em 0.625em;
      }

      ${e} legend {
        box-sizing: border-box;
        color: inherit;
        display: table;
        max-width: 100%;
        padding: 0;
        white-space: normal;
      }

      ${e} progress {
        vertical-align: baseline;
      }

      ${e} textarea {
        overflow: auto;
      }

      ${e} :where([type="checkbox"], [type="radio"]) {
        box-sizing: border-box;
        padding: 0;
      }

      ${e} input[type="number"]::-webkit-inner-spin-button,
      ${e} input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none !important;
      }

      ${e} input[type="number"] {
        -moz-appearance: textfield;
      }

      ${e} input[type="search"] {
        -webkit-appearance: textfield;
        outline-offset: -2px;
      }

      ${e} input[type="search"]::-webkit-search-decoration {
        -webkit-appearance: none !important;
      }

      ${e} ::-webkit-file-upload-button {
        -webkit-appearance: button;
        font: inherit;
      }

      ${e} details {
        display: block;
      }

      ${e} summary {
        display: list-item;
      }

      template {
        display: none;
      }

      [hidden] {
        display: none !important;
      }

      ${e} :where(
          blockquote,
          dl,
          dd,
          h1,
          h2,
          h3,
          h4,
          h5,
          h6,
          hr,
          figure,
          p,
          pre
        ) {
        margin: 0;
      }

      ${e} button {
        background: transparent;
        padding: 0;
      }

      ${e} fieldset {
        margin: 0;
        padding: 0;
      }

      ${e} :where(ol, ul) {
        margin: 0;
        padding: 0;
      }

      ${e} textarea {
        resize: vertical;
      }

      ${e} :where(button, [role="button"]) {
        cursor: pointer;
      }

      ${e} button::-moz-focus-inner {
        border: 0 !important;
      }

      ${e} table {
        border-collapse: collapse;
      }

      ${e} :where(h1, h2, h3, h4, h5, h6) {
        font-size: inherit;
        font-weight: inherit;
      }

      ${e} :where(button, input, optgroup, select, textarea) {
        padding: 0;
        line-height: inherit;
        color: inherit;
      }

      ${e} :where(img, svg, video, canvas, audio, iframe, embed, object) {
        display: block;
      }

      ${e} :where(img, video) {
        max-width: 100%;
        height: auto;
      }

      [data-js-focus-visible]
        :focus:not([data-focus-visible-added]):not(
          [data-focus-visible-disabled]
        ) {
        outline: none;
        box-shadow: none;
      }

      ${e} select::-ms-expand {
        display: none;
      }

      ${H}
    `}),j={light:"chakra-ui-light",dark:"chakra-ui-dark"};function Oe(e={}){const{preventTransition:t=!0}=e,r={setDataset:s=>{const n=t?r.preventTransition():void 0;document.documentElement.dataset.theme=s,document.documentElement.style.colorScheme=s,n?.()},setClassName(s){document.body.classList.add(s?j.dark:j.light),document.body.classList.remove(s?j.light:j.dark)},query(){return window.matchMedia("(prefers-color-scheme: dark)")},getSystemTheme(s){var n;return((n=r.query().matches)!=null?n:s==="dark")?"dark":"light"},addListener(s){const n=r.query(),a=i=>{s(i.matches?"dark":"light")};return typeof n.addListener=="function"?n.addListener(a):n.addEventListener("change",a),()=>{typeof n.removeListener=="function"?n.removeListener(a):n.removeEventListener("change",a)}},preventTransition(){const s=document.createElement("style");return s.appendChild(document.createTextNode("*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}")),document.head.appendChild(s),()=>{window.getComputedStyle(document.body),requestAnimationFrame(()=>{requestAnimationFrame(()=>{document.head.removeChild(s)})})}}};return r}var Te="chakra-ui-color-mode";function Re(e){return{ssr:!1,type:"localStorage",get(t){if(!globalThis?.document)return t;let r;try{r=localStorage.getItem(e)||t}catch{}return r||t},set(t){try{localStorage.setItem(e,t)}catch{}}}}var Ae=Re(Te),B=()=>{};function D(e,t){return e.type==="cookie"&&e.ssr?e.get(t):t}function G(e){const{value:t,children:r,options:{useSystemColorMode:s,initialColorMode:n,disableTransitionOnChange:a}={},colorModeManager:i=Ae}=e,l=n==="dark"?"dark":"light",[f,u]=c.useState(()=>D(i,l)),[y,g]=c.useState(()=>D(i)),{getSystemTheme:w,setClassName:b,setDataset:h,addListener:p}=c.useMemo(()=>Oe({preventTransition:a}),[a]),m=n==="system"&&!f?y:f,d=c.useCallback(k=>{const P=k==="system"?w():k;u(P),b(P==="dark"),h(P),i.set(P)},[i,w,b,h]);N(()=>{n==="system"&&g(w())},[]),c.useEffect(()=>{const k=i.get();if(k){d(k);return}if(n==="system"){d("system");return}d(l)},[i,l,n,d]);const S=c.useCallback(()=>{d(m==="dark"?"light":"dark")},[m,d]);c.useEffect(()=>{if(s)return p(d)},[s,p,d]);const C=c.useMemo(()=>({colorMode:t??m,toggleColorMode:t?B:S,setColorMode:t?B:d,forced:t!==void 0}),[m,S,d,t]);return o.jsx(K.Provider,{value:C,children:r})}G.displayName="ColorModeProvider";var Fe=e=>{const{children:t,colorModeManager:r,portalZIndex:s,resetScope:n,resetCSS:a=!0,theme:i={},environment:l,cssVarsRoot:f,disableEnvironment:u,disableGlobalStyle:y}=e,g=o.jsx(X,{environment:l,disabled:u,children:t});return o.jsx(W,{theme:i,cssVarsRoot:f,children:o.jsxs(G,{colorModeManager:r,options:i.config,children:[a?o.jsx($e,{scope:n}):o.jsx(Ee,{}),!y&&o.jsx(U,{}),s?o.jsx(V,{zIndex:s,children:g}):g]})})},Qe=e=>function({children:r,theme:s=e,toastOptions:n,...a}){return o.jsxs(Fe,{theme:s,...a,children:[o.jsx(ee,{value:n?.defaultOptions,children:r}),o.jsx(te,{...n})]})},Be=Qe(J);const De="/assets/prototype-checkout-upsell/assets/AvenirLTPro-Black-BUJjmrH1.otf",ze="/assets/prototype-checkout-upsell/assets/AvenirLTPro-Roman-LUlrUecY.woff",qe="/assets/prototype-checkout-upsell/assets/AvenirLTPro-Roman-BA9CA2I_.woff2",Le="/assets/prototype-checkout-upsell/assets/GreycliffCFBold-Dis_NzbC.woff",_e="/assets/prototype-checkout-upsell/assets/GreycliffCFBold-D3aVobzR.woff2",Ie="/assets/prototype-checkout-upsell/assets/GreycliffCFDemiBold-B_OedWmB.woff",He="/assets/prototype-checkout-upsell/assets/GreycliffCFDemiBold-CMuORzHY.woff2",Ge="/assets/prototype-checkout-upsell/assets/GreycliffCFRegular-DhiFwu0T.woff",Ne="/assets/prototype-checkout-upsell/assets/GreycliffCFRegular-DDJsBBz6.woff2",Ke="/assets/prototype-checkout-upsell/assets/Inter-VariableFont-c8O0ljhh.ttf",We="/assets/prototype-checkout-upsell/assets/Mackinac-Book-Bjh3dNgU.ttf",Ue="/assets/prototype-checkout-upsell/assets/Mackinac-Medium-C_98ffxP.ttf",Ve="/assets/prototype-checkout-upsell/assets/QuincyCFRegular-CAMAZOrP.woff",Je="/assets/prototype-checkout-upsell/assets/QuincyCFRegular-DmrEIxP_.woff2",Ye="/assets/prototype-checkout-upsell/assets/SourceCodePro-Regular-DOYyUo9E.ttf",Ze="/assets/prototype-checkout-upsell/assets/SpaceMono-Regular-Ba0nOT4a.ttf";function Xe({useRebrand:e}){return e?o.jsx(E,{styles:`
          @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 100 900;
            font-display: swap;
            src: url('${Ke}') format('truetype');
          }
          @font-face {
            font-family: 'SpaceMono';
            font-weight: 400;
            font-style: normal;
            font-display: swap;
            src: url('${Ze}') format('truetype');
          }
          @font-face {
            font-family: 'MackinacPro';
            font-weight: 400;
            font-style: normal;
            font-display: swap;
            src: url('${We}') format('truetype');
          }
          @font-face {
            font-family: 'MackinacPro';
            font-weight: 500;
            font-style: normal;
            font-display: swap;
            src: url('${Ue}') format('truetype');
          }
        `}):o.jsx(E,{styles:`
        @font-face {
          font-family: 'Greycliff';
          font-weight: 400;
          font-style: normal;
          src: url('${Ne}') format('woff2'), url('${Ge}') format('woff');
        }

        @font-face {
          font-family: 'Greycliff';
          font-weight: 600;
          font-style: normal;
          src: url('${He}') format('woff2'), url('${Ie}') format('woff');
        }

        @font-face {
          font-family: 'Greycliff';
          font-weight: 700;
          font-style: normal;
          src: url('${_e}') format('woff2'), url('${Le}') format('woff');
        }

        @font-face {
          font-family: 'Avenir';
          font-weight: 400;
          font-style: normal;
          src: url('${qe}') format('woff2'), url('${ze}') format('woff');
        }

        @font-face {
          font-family: 'Avenir Black';
          font-weight: 400;
          font-style: normal;
          src: url('${De}') format('otf');
        }

        @font-face {
          font-family: 'Quincy CF';
          font-weight: 400;
          font-style: normal;
          src: url('${Je}') format('woff2'), url('${Ve}') format('woff');
        }

        @font-face {
          font-family: 'Source Code Pro';
          font-weight: 400;
          font-style: normal;
          src: url('${Ye}') format('ttf');
        }
      `})}function et({children:e,useRebrand:t=!1}){return o.jsxs(Be,{theme:t?Y:Z,children:[o.jsx(Xe,{useRebrand:t}),e]})}const tt="/assets/prototype-checkout-upsell/assets/freakflags-BEXOlBmo.css",rt="/assets/prototype-checkout-upsell/assets/styles-KPtLCsBp.css",st="/assets/prototype-checkout-upsell/assets/datepicker-BSfD6kVr.css";var ot=class extends q{constructor(e={}){super(),this.config=e,this.#e=new Map}#e;build(e,t,r){const s=t.queryKey,n=t.queryHash??L(s,t);let a=this.get(n);return a||(a=new re({cache:this,queryKey:s,queryHash:n,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(s)}),this.add(a)),a}add(e){this.#e.has(e.queryHash)||(this.#e.set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=this.#e.get(e.queryHash);t&&(e.destroy(),t===e&&this.#e.delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){v.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return this.#e.get(e)}getAll(){return[...this.#e.values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>$(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>$(e,r)):t}notify(e){v.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){v.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){v.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},nt=class extends q{constructor(e={}){super(),this.config=e,this.#e=new Map,this.#t=Date.now()}#e;#t;build(e,t,r){const s=new se({mutationCache:this,mutationId:++this.#t,options:e.defaultMutationOptions(t),state:r});return this.add(s),s}add(e){const t=M(e),r=this.#e.get(t)??[];r.push(e),this.#e.set(t,r),this.notify({type:"added",mutation:e})}remove(e){const t=M(e);if(this.#e.has(t)){const r=this.#e.get(t)?.filter(s=>s!==e);r&&(r.length===0?this.#e.delete(t):this.#e.set(t,r))}this.notify({type:"removed",mutation:e})}canRun(e){const t=this.#e.get(M(e))?.find(r=>r.state.status==="pending");return!t||t===e}runNext(e){return this.#e.get(M(e))?.find(r=>r!==e&&r.state.isPaused)?.continue()??Promise.resolve()}clear(){v.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}getAll(){return[...this.#e.values()].flat()}find(e){const t={exact:!0,...e};return this.getAll().find(r=>O(t,r))}findAll(e={}){return this.getAll().filter(t=>O(e,t))}notify(e){v.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return v.batch(()=>Promise.all(e.map(t=>t.continue().catch(x))))}};function M(e){return e.options.scope?.id??String(e.mutationId)}function at(e){return{onFetch:(t,r)=>{const s=async()=>{const n=t.options,a=t.fetchOptions?.meta?.fetchMore?.direction,i=t.state.data?.pages||[],l=t.state.data?.pageParams||[],f={pages:[],pageParams:[]};let u=!1;const y=h=>{Object.defineProperty(h,"signal",{enumerable:!0,get:()=>(t.signal.aborted?u=!0:t.signal.addEventListener("abort",()=>{u=!0}),t.signal)})},g=oe(t.options,t.fetchOptions),w=async(h,p,m)=>{if(u)return Promise.reject();if(p==null&&h.pages.length)return Promise.resolve(h);const d={queryKey:t.queryKey,pageParam:p,direction:m?"backward":"forward",meta:t.options.meta};y(d);const S=await g(d),{maxPages:C}=t.options,k=m?ne:ae;return{pages:k(h.pages,S,C),pageParams:k(h.pageParams,p,C)}};let b;if(a&&i.length){const h=a==="backward",p=h?it:z,m={pages:i,pageParams:l},d=p(n,m);b=await w(m,d,h)}else{b=await w(f,l[0]??n.initialPageParam);const h=e??i.length;for(let p=1;p<h;p++){const m=z(n,b);if(m==null)break;b=await w(b,m)}}return b};t.options.persister?t.fetchFn=()=>t.options.persister?.(s,{queryKey:t.queryKey,meta:t.options.meta,signal:t.signal},r):t.fetchFn=s}}}function z(e,{pages:t,pageParams:r}){const s=t.length-1;return t.length>0?e.getNextPageParam(t[s],t,r[s],r):void 0}function it(e,{pages:t,pageParams:r}){return t.length>0?e.getPreviousPageParam?.(t[0],t,r[0],r):void 0}var lt=class{#e;#t;#r;#o;#n;#s;#a;#i;constructor(e={}){this.#e=e.queryCache||new ot,this.#t=e.mutationCache||new nt,this.#r=e.defaultOptions||{},this.#o=new Map,this.#n=new Map,this.#s=0}mount(){this.#s++,this.#s===1&&(this.#a=ie.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#e.onFocus())}),this.#i=T.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#e.onOnline())}))}unmount(){this.#s--,this.#s===0&&(this.#a?.(),this.#a=void 0,this.#i?.(),this.#i=void 0)}isFetching(e){return this.#e.findAll({...e,fetchStatus:"fetching"}).length}isMutating(e){return this.#t.findAll({...e,status:"pending"}).length}getQueryData(e){const t=this.defaultQueryOptions({queryKey:e});return this.#e.get(t.queryHash)?.state.data}ensureQueryData(e){const t=this.getQueryData(e.queryKey);if(t===void 0)return this.fetchQuery(e);{const r=this.defaultQueryOptions(e),s=this.#e.build(this,r);return e.revalidateIfStale&&s.isStaleByTime(R(r.staleTime,s))&&this.prefetchQuery(r),Promise.resolve(t)}}getQueriesData(e){return this.#e.findAll(e).map(({queryKey:t,state:r})=>{const s=r.data;return[t,s]})}setQueryData(e,t,r){const s=this.defaultQueryOptions({queryKey:e}),a=this.#e.get(s.queryHash)?.state.data,i=le(t,a);if(i!==void 0)return this.#e.build(this,s).setData(i,{...r,manual:!0})}setQueriesData(e,t,r){return v.batch(()=>this.#e.findAll(e).map(({queryKey:s})=>[s,this.setQueryData(s,t,r)]))}getQueryState(e){const t=this.defaultQueryOptions({queryKey:e});return this.#e.get(t.queryHash)?.state}removeQueries(e){const t=this.#e;v.batch(()=>{t.findAll(e).forEach(r=>{t.remove(r)})})}resetQueries(e,t){const r=this.#e,s={type:"active",...e};return v.batch(()=>(r.findAll(e).forEach(n=>{n.reset()}),this.refetchQueries(s,t)))}cancelQueries(e={},t={}){const r={revert:!0,...t},s=v.batch(()=>this.#e.findAll(e).map(n=>n.cancel(r)));return Promise.all(s).then(x).catch(x)}invalidateQueries(e={},t={}){return v.batch(()=>{if(this.#e.findAll(e).forEach(s=>{s.invalidate()}),e.refetchType==="none")return Promise.resolve();const r={...e,type:e.refetchType??e.type??"active"};return this.refetchQueries(r,t)})}refetchQueries(e={},t){const r={...t,cancelRefetch:t?.cancelRefetch??!0},s=v.batch(()=>this.#e.findAll(e).filter(n=>!n.isDisabled()).map(n=>{let a=n.fetch(void 0,r);return r.throwOnError||(a=a.catch(x)),n.state.fetchStatus==="paused"?Promise.resolve():a}));return Promise.all(s).then(x)}fetchQuery(e){const t=this.defaultQueryOptions(e);t.retry===void 0&&(t.retry=!1);const r=this.#e.build(this,t);return r.isStaleByTime(R(t.staleTime,r))?r.fetch(t):Promise.resolve(r.state.data)}prefetchQuery(e){return this.fetchQuery(e).then(x).catch(x)}fetchInfiniteQuery(e){return e.behavior=at(e.pages),this.fetchQuery(e)}prefetchInfiniteQuery(e){return this.fetchInfiniteQuery(e).then(x).catch(x)}resumePausedMutations(){return T.isOnline()?this.#t.resumePausedMutations():Promise.resolve()}getQueryCache(){return this.#e}getMutationCache(){return this.#t}getDefaultOptions(){return this.#r}setDefaultOptions(e){this.#r=e}setQueryDefaults(e,t){this.#o.set(A(e),{queryKey:e,defaultOptions:t})}getQueryDefaults(e){const t=[...this.#o.values()];let r={};return t.forEach(s=>{F(e,s.queryKey)&&(r={...r,...s.defaultOptions})}),r}setMutationDefaults(e,t){this.#n.set(A(e),{mutationKey:e,defaultOptions:t})}getMutationDefaults(e){const t=[...this.#n.values()];let r={};return t.forEach(s=>{F(e,s.mutationKey)&&(r={...r,...s.defaultOptions})}),r}defaultQueryOptions(e){if(e._defaulted)return e;const t={...this.#r.queries,...this.getQueryDefaults(e.queryKey),...e,_defaulted:!0};return t.queryHash||(t.queryHash=L(t.queryKey,t)),t.refetchOnReconnect===void 0&&(t.refetchOnReconnect=t.networkMode!=="always"),t.throwOnError===void 0&&(t.throwOnError=!!t.suspense),!t.networkMode&&t.persister&&(t.networkMode="offlineFirst"),t.enabled!==!0&&t.queryFn===ue&&(t.enabled=!1),t}defaultMutationOptions(e){return e?._defaulted?e:{...this.#r.mutations,...e?.mutationKey&&this.getMutationDefaults(e.mutationKey),...e,_defaulted:!0}}clear(){this.#e.clear(),this.#t.clear()}},ut=function(){return null};function ct(){return()=>{}}function ft(){return c.useSyncExternalStore(ct,()=>!0,()=>!1)}function dt(){let e=ht();return c.createElement(c.Fragment,null,e.map(t=>c.createElement(pt,{key:t.src,...t})))}function ht(){let e=_(),t=ve();return c.useMemo(()=>{let r=t.flatMap((n,a,i)=>{if(!n.handle)return[];if(n.handle===null)return[];if(typeof n.handle!="object")return[];if(!("scripts"in n.handle))return[];let l=n.handle.scripts;if(Array.isArray(l))return l;if(typeof l!="function")return[];let f=l({id:n.id,data:n.data,params:n.params,location:e,parentsData:i.slice(0,a).map(u=>u.data),matches:i});return Array.isArray(f)?f:[]}),s=new Map;for(let n of r)s.set(n.src,n);return[...s.values()]},[t,e])}function pt({src:e,preload:t=!1,async:r=!0,defer:s=!0,crossOrigin:n,integrity:a,type:i,referrerPolicy:l,noModule:f,nonce:u,id:y}){let g=ft(),w=c.useRef(g);if(c.useEffect(()=>{if(!w.current&&g)return;let p=document.createElement("script");p.src=e;let m={async:r,defer:s,crossOrigin:n,integrity:a,type:i,referrerPolicy:l,noModule:f,nonce:u,id:y};for(let[d,S]of Object.entries(m))S&&p.setAttribute(d,S.toString());return document.body.appendChild(p),()=>p.remove()},[r,n,s,a,g,f,u,l,e,i,y]),w.current&&g)return null;let b=f?"modulepreload":"preload",h=f?void 0:"script";return c.createElement(c.Fragment,null,t&&c.createElement("link",{rel:b,href:e,as:h,crossOrigin:n,integrity:a,referrerPolicy:l}),c.createElement("script",{id:y,src:e,defer:s,async:r,type:i,noModule:f,nonce:u,crossOrigin:n,integrity:a,referrerPolicy:l}))}const mt="/assets/prototype-checkout-upsell/assets/carousel-By2fq_BO.css";async function yt(){return Promise.resolve(ce())}function gt(){return null}async function bt(e,t,r){return Promise.resolve(gt())}const vt=new lt({defaultOptions:{queries:{refetchOnWindowFocus:!1,retry:!1,throwOnError:!0}}});function Dt(){return[{rel:"icon",href:"/assets/prototype-checkout-upsell/favicon.ico",type:"image/ico"},{rel:"stylesheet",href:rt},{rel:"stylesheet",href:st},{rel:"stylesheet",href:tt},{rel:"stylesheet",href:mt}]}const zt=async()=>{const[{shop:e,store:t,accountData:r,internalSettings:s,storeOnboardingSettings:n,hasAcceptedTermsOfService:a,shopifyAuthUpdateLink:i},l]=await Promise.all([yt(),he()]),f=await bt(e,s,r.platform),u={};Object.entries(Se).forEach(([g,w])=>{const b=Ce.get(w.name);b?u[g]=b:u[g]=null});const y={isAdmin:!!r.is_recharge_admin,permissions:r.account?.permissions||[],betaFlags:s.beta_flags,generalAttributes:s.general_attributes,storeId:s.id,isPro:s.is_pro,isTestStore:s.test_mode,platform:r.platform,userId:r.account?.user_id,email:r.account?.include?.user?.email,staffUserEmail:r.staff_user_email};return Pe.setState({user:y}),{shop:e,store:t,accountData:r,internalSettings:s,storeOnboardingSettings:n,countries:l,ENV:{CDN_URL:"https://static.rechargecdn.com",RC_ENV:"production"},shopifyAuthUpdateLink:i,storeTrial:f,cookies:u,hasAcceptedTermsOfService:a}};function qt({children:e}){return o.jsxs("html",{lang:"en",children:[o.jsxs("head",{children:[o.jsx("meta",{charSet:"utf-8"}),o.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),o.jsx(we,{}),o.jsx(xe,{})]}),o.jsxs("body",{children:[o.jsx(et,{children:e}),o.jsx(Me,{}),o.jsx(ke,{}),o.jsx(dt,{})]})]})}function Lt(){return o.jsxs(fe,{client:vt,children:[o.jsx(de,{children:o.jsx(ye,{})}),o.jsx(ut,{})]})}function _t(){return c.useEffect(()=>{document.title="Error | Recharge"},[]),o.jsx(pe,{})}function It(){return o.jsxs("div",{style:{padding:"3rem",textAlign:"center",fontFamily:"system-ui, sans-serif",color:"#191D48"},children:[o.jsx("div",{"aria-hidden":!0,style:{width:44,height:44,margin:"0 auto 1.25rem",borderRadius:"50%",border:"3px solid #E9EAEB",borderTopColor:"#3901F1",animation:"rc-playground-spin 0.85s linear infinite"}}),o.jsx("p",{style:{fontSize:"17px",fontWeight:600,marginBottom:"0.75rem"},children:"Loading playground…"}),o.jsxs("div",{style:{fontSize:"14px",lineHeight:"22px",opacity:.9,maxWidth:"34rem",margin:"0 auto",textAlign:"left"},children:[o.jsxs("p",{style:{marginBottom:"0.75rem"},children:["You are seeing HTML from this app, but the ",o.jsx("strong",{children:"JavaScript bundles have not finished loading or running"})," ","(different from “connection refused”, which means no server on that URL). Cursor’s Simple Browser often blocks these scripts — use standalone Chrome."]}),o.jsxs("p",{style:{marginBottom:"0.75rem"},children:[o.jsx("strong",{children:"Dev"})," (",o.jsx("code",{style:{fontSize:"13px"},children:"npm run dev:browse-checkout-swap"}),"): copy the"," ",o.jsx("strong",{children:"port"})," from the ",o.jsx("strong",{children:"Local:"})," line in Terminal (3000, 3001, … — not guesswork)."]}),o.jsxs("p",{style:{marginBottom:"0.75rem"},children:[o.jsx("strong",{children:"Preview"})," (",o.jsx("code",{style:{fontSize:"13px"},children:"npm run preview:checkout-swap"}),"): also use"," ","whatever ",o.jsx("strong",{children:"Local:"})," prints — if 9876 was busy Vite picks 9877, 9878, … The URL is always"," ",o.jsx("code",{style:{fontSize:"13px"},children:"http://127.0.0.1:THAT_PORT/merchant/cross-sell-upsell/checkout-upsell-swap-setup"}),"."]}),o.jsxs("p",{style:{marginBottom:"0.75rem"},children:["macOS Chrome (recommended): Terminal →"," ",o.jsx("code",{style:{fontSize:"12px",backgroundColor:"#E9EAEB",padding:"2px 6px",borderRadius:4},children:'open -a "Google Chrome" "http://127.0.0.1:PASTE_PORT_HERE/merchant/cross-sell-upsell/checkout-upsell-swap-setup"'}),o.jsx("br",{}),"Replace ",o.jsx("code",{style:{fontSize:"13px"},children:"PASTE_PORT_HERE"})," with what ",o.jsx("strong",{children:"Local:"})," shows after the colon (",o.jsx("code",{style:{fontSize:"13px"},children:"3000"}),", ",o.jsx("code",{style:{fontSize:"13px"},children:"3001"}),", etc.)."]}),o.jsxs("p",{style:{marginBottom:"0.75rem"},children:["Then in Chrome → ",o.jsx("kbd",{style:{padding:"1px 4px",borderRadius:3},children:"⌥⌘J"})," (Console): look for"," ",o.jsx("code",{style:{fontSize:"13px"},children:"[playground]"})," or red errors — and"," ",o.jsx("kbd",{style:{padding:"1px 4px",borderRadius:3},children:"⌘⇧R"})," once to hard‑reload without cache."]}),o.jsxs("p",{style:{marginBottom:0},children:["Quick check (Chrome Network, enable ",o.jsx("strong",{children:"Preserve log"}),", then ",o.jsx("kbd",{style:{padding:"1px 4px",borderRadius:3},children:"⌘⇧R"}),"): you should see JS under ",o.jsx("code",{style:{fontSize:"13px"},children:"/assets/"})," or ",o.jsx("code",{style:{fontSize:"13px"},children:"@vite"})," ","with Status ",o.jsx("strong",{children:"200"}),". If every script is blocked/failed/red, this page stays forever — fix host/port/https (must be plain ",o.jsx("code",{style:{fontSize:"13px"},children:"http:"}),"), try Incognito with extensions off, or free the occupied port (",o.jsx("code",{style:{fontSize:"13px"},children:"lsof -nP -iTCP:PORT -sTCP:LISTEN"}),")."]})]}),o.jsx("style",{children:"@keyframes rc-playground-spin { to { transform: rotate(360deg); } }"})]})}export{_t as ErrorBoundary,It as HydrateFallback,qt as Layout,zt as clientLoader,Lt as default,Dt as links};
