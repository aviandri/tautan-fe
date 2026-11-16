// Server-safe copies of the lucide icons the public page uses (lucide ISC licence, v1.73.0).
// lucide-react 1.x renders through a client component (it reads a context), so each icon in a
// server-rendered card would ship and hydrate its runtime; these are plain SVG with zero JS.
// Regenerate by copying the icon nodes from node_modules/lucide-react/dist/esm/icons/<name>.mjs.
import type { SVGProps } from "react";

type Node = [string, Record<string, string>][];

function make(name: string, node: Node) {
  function Icon({ className, ...rest }: SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className ? `lucide lucide-${name} ${className}` : `lucide lucide-${name}`}
        {...rest}
      >
        {node.map(([tag, { key, ...attrs }]) => {
          const Tag = tag as "path";
          return <Tag key={key} {...attrs} />;
        })}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const BriefcaseBusiness = make("briefcase-business", [["path",{"d":"M12 12h.01","key":"1mp3jc"}],["path",{"d":"M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2","key":"1ksdt3"}],["path",{"d":"M22 13a18.15 18.15 0 0 1-20 0","key":"12hx5q"}],["rect",{"width":"20","height":"14","x":"2","y":"6","rx":"2","key":"i6l2r4"}]]);
export const Calendar = make("calendar", [["path",{"d":"M8 2v3","key":"1ioesn"}],["path",{"d":"M16 2v3","key":"otl347"}],["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2","key":"h1oib"}],["path",{"d":"M3 9h18","key":"1pudct"}]]);
export const ChevronDown = make("chevron-down", [["path",{"d":"m6 9 6 6 6-6","key":"qrunsl"}]]);
export const Copy = make("copy", [["rect",{"width":"14","height":"14","x":"8","y":"8","rx":"2","ry":"2","key":"17jyea"}],["path",{"d":"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2","key":"zix9uf"}]]);
export const Download = make("download", [["path",{"d":"M12 15V3","key":"m9g1x1"}],["path",{"d":"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","key":"ih7n3h"}],["path",{"d":"m7 10 5 5 5-5","key":"brsn70"}]]);
export const FileText = make("file-text", [["path",{"d":"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z","key":"1oefj6"}],["path",{"d":"M14 2v5a1 1 0 0 0 1 1h5","key":"wfsgrz"}],["path",{"d":"M10 9H8","key":"b1mrlr"}],["path",{"d":"M16 13H8","key":"t4e002"}],["path",{"d":"M16 17H8","key":"z1uh3a"}]]);
export const Globe = make("globe", [["circle",{"cx":"12","cy":"12","r":"10","key":"1mglay"}],["path",{"d":"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20","key":"13o1zl"}],["path",{"d":"M2 12h20","key":"9i4pu4"}]]);
export const Mail = make("mail", [["path",{"d":"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7","key":"132q7q"}],["rect",{"x":"2","y":"4","width":"20","height":"16","rx":"2","key":"izxlao"}]]);
export const Minus = make("minus", [["path",{"d":"M5 12h14","key":"1ays0h"}]]);
export const Play = make("play", [["path",{"d":"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z","key":"10ikf1"}]]);
export const Plus = make("plus", [["path",{"d":"M5 12h14","key":"1ays0h"}],["path",{"d":"M12 5v14","key":"s699le"}]]);
export const Share2 = make("share-2", [["circle",{"cx":"18","cy":"5","r":"3","key":"gq8acd"}],["circle",{"cx":"6","cy":"12","r":"3","key":"w7nqdw"}],["circle",{"cx":"18","cy":"19","r":"3","key":"1xt0gg"}],["line",{"x1":"8.59","x2":"15.42","y1":"13.51","y2":"17.49","key":"47mynk"}],["line",{"x1":"15.41","x2":"8.59","y1":"6.51","y2":"10.49","key":"1n3mei"}]]);
export const ShoppingBag = make("shopping-bag", [["path",{"d":"M16 10a4 4 0 0 1-8 0","key":"1ltviw"}],["path",{"d":"M3.103 6.034h17.794","key":"awc11p"}],["path",{"d":"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z","key":"o988cm"}]]);
export const UserPlus = make("user-plus", [["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","key":"1yyitq"}],["circle",{"cx":"9","cy":"7","r":"4","key":"nufk8"}],["line",{"x1":"19","x2":"19","y1":"8","y2":"14","key":"1bvyxn"}],["line",{"x1":"22","x2":"16","y1":"11","y2":"11","key":"1shjgl"}]]);
export const X = make("x", [["path",{"d":"M18 6 6 18","key":"1bl5f8"}],["path",{"d":"m6 6 12 12","key":"d8bk6v"}]]);
