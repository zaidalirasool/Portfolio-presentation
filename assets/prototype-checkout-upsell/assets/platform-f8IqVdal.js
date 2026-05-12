function n(e){const i=e.title.includes("|"),t=[{title:`${e.title}${i?"":" | Recharge"}`}];return e.description&&t.push({name:"description",content:e.description}),()=>t}export{n as c};
