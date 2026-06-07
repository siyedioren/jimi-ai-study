import SubmitPage from "@/components/ProblemSet/SubmitPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProblemDetailRoute({ params }: Props) {
  const { id } = await params;
  return <SubmitPage problemId={id} />;
}
