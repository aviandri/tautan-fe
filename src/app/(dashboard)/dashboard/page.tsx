import { Suspense } from "react";
import { Editor } from "@/components/editor/Editor";

export default function EditorPage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
