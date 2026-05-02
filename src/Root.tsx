import "./index.css";
import { Composition, CalculateMetadataFunction } from "remotion";
import { GenericExplainerVideo } from "./Composition";
import { AnyProblemData } from "./types/problem";

const sampleData: AnyProblemData = {
  id: "sample-1",
  type: "grammar",
  title: "初中英语定语从句解析",
  question: "The man ___ is talking to our teacher is my uncle.",
  options: ["which", "whom", "who", "whose"],
  correctAnswer: 2,
  explanation: "这道题考察定语从句的引导词。先行词是 the man，指人，且在从句中作主语（is talking前缺少主语），所以应该用 who。which 指物；whom 指人但在从句中作宾语；whose 表示所属关系。因此正确答案是 C。"
};

const calculateMetadata: CalculateMetadataFunction<{data: AnyProblemData}> = async ({ props }) => {
  return {
    durationInFrames: props.data.durationInFrames || 500,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProblemExplainer"
        component={GenericExplainerVideo as React.FC<{data: AnyProblemData}>}
        durationInFrames={500}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ data: sampleData }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
