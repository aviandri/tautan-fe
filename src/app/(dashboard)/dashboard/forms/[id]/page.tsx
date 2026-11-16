import { FormResponses } from "@/components/forms/FormResponses";

export default async function FormResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormResponses blockId={id} />;
}
