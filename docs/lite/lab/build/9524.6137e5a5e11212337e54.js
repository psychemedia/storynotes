"use strict";(self.webpackChunk_JUPYTERLAB_CORE_OUTPUT=self.webpackChunk_JUPYTERLAB_CORE_OUTPUT||[]).push([[9524,5673],{89524:(e,t,n)=>{n.r(t),n.d(t,{default:()=>l});var a,r=n(52884),o=n(92005),i=n(61429),c=n(74161),d=n(79487);!function(e){e.trustHTML="htmlviewer:trust-html"}(a||(a={}));const l={activate:function(e,t,n,r){const c=t.load("jupyterlab"),l={name:"html",contentType:"file",fileFormat:"text",displayName:c.__("HTML File"),extensions:[".html"],mimeTypes:["text/html"],icon:d.html5Icon};e.docRegistry.addFileType(l);const s=new i.HTMLViewerFactory({name:c.__("HTML Viewer"),fileTypes:["html"],defaultFor:["html"],readOnly:!0}),m=new o.WidgetTracker({namespace:"htmlviewer"});return r&&r.restore(m,{command:"docmanager:open",args:e=>({path:e.context.path,factory:"HTML Viewer"}),name:e=>e.context.path}),e.docRegistry.addWidgetFactory(s),s.widgetCreated.connect(((t,n)=>{var r,o;m.add(n),n.context.pathChanged.connect((()=>{m.save(n)})),n.trustedChanged.connect((()=>{e.commands.notifyCommandChanged(a.trustHTML)})),n.title.icon=l.icon,n.title.iconClass=null!==(r=l.iconClass)&&void 0!==r?r:"",n.title.iconLabel=null!==(o=l.iconLabel)&&void 0!==o?o:""})),e.commands.addCommand(a.trustHTML,{label:c.__("Trust HTML File"),isEnabled:()=>!!m.currentWidget,isToggled:()=>{const e=m.currentWidget;return!!e&&-1!==e.content.sandbox.indexOf("allow-scripts")},execute:()=>{const e=m.currentWidget;if(!e)return!1;e.trusted=!e.trusted}}),n&&n.addItem({command:a.trustHTML,category:c.__("File Operations")}),m},id:"@jupyterlab/htmlviewer-extension:plugin",provides:i.IHTMLViewerTracker,requires:[c.ITranslator],optional:[o.ICommandPalette,r.ILayoutRestorer],autoStart:!0}}}]);
//# sourceMappingURL=9524.6137e5a5e11212337e54.js.map