import OpenAI from 'openai';
import dotenv from 'dotenv';
import { ProblemType } from '../types/problem';

dotenv.config();

export interface LLMConfig {
  apiKey?: string;
  baseURL?: string;
}

function createClient(config?: LLMConfig): OpenAI {
  return new OpenAI({
    apiKey: config?.apiKey || process.env.OPENAI_API_KEY || '',
    baseURL: config?.baseURL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com',
  });
}

export async function testConnection(config: LLMConfig): Promise<void> {
  const client = createClient(config);
  await client.models.list();
}

export async function splitTextToProblems(rawText: string, modelName: string = 'deepseek-chat', config?: LLMConfig): Promise<Array<{ title: string, question: string, type: ProblemType }>> {
  const systemPrompt = `你是一个智能题目提取助手。你的任务是从用户输入的一长段文本中，识别并提取出多个独立的面试题或知识点题目。
文本可能是面经、八股文汇总或题库列表。

请返回一个合法的 JSON 对象，包含一个 \`problems\` 数组，数组中的每个对象必须包含：
- \`title\`: 题目的简短标题或核心考点（如 "Java多态机制"、"TCP三次握手"）
- \`question\`: 完整的题目描述或面试官提问原话
- \`type\`: 统一返回 "java_interview"（当前主要针对八股文）

请严格按以下 JSON 格式返回，不要包含 markdown 标记：
{
  "problems": [
    {
      "title": "String、StringBuffer与StringBuilder的区别",
      "question": "请详细说明Java中String、StringBuffer和StringBuilder这三者的区别及各自的使用场景。",
      "type": "java_interview"
    }
  ]
}`;

  const client = createClient(config);
  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `原始长文本：\n${rawText}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(content);
    return parsed.problems || [];
  } catch (error) {
    console.error('Failed to split text with LLM:', error);
    throw new Error('长文本智能拆分请求失败，请检查 API Key 和网络连接。');
  }
}

export async function parseProblemWithLLM(rawText: string, targetType: ProblemType, modelName: string = 'deepseek-chat', language: string = 'javascript', config?: LLMConfig) {
  const systemPrompt = `你是一个专业的教师和题解视频文案编写专家。你的任务是将用户输入的原始题目文本，解析并结构化为特定类型的 JSON 格式数据。
这个 JSON 数据将直接用于生成带配音的视频。因此，你的 explanation (讲解文案) 字段应该像口语化的老师讲课一样，生动、清晰、循序渐进。

目标题型: ${targetType}
目标编程语言: ${language}

请严格根据以下目标题型的 Schema 要求返回合法的 JSON 对象，不要包含任何 markdown 标记或其他多余文字：

如果 targetType 是 "grammar":
{
  "id": "随机生成唯一字符串",
  "type": "grammar",
  "title": "这道题的总结性标题（如：中考英语定语从句解析）",
  "question": "完整的题目内容，挖空部分用 ___ 表示",
  "options": ["选项A内容", "选项B内容", "选项C内容", "选项D内容"],
  "correctAnswer": 0到3之间的整数（代表正确选项的索引）,
  "explanation": "这道题考察了...首先...所以我们选..."
}

如果 targetType 是 "java_interview":
{
  "id": "随机生成唯一字符串",
  "type": "java_interview",
  "title": "知识点归类（如：Java基础 - 面向对象）",
  "question": "具体的面试问题（如：什么是多态？它的实现机制是什么？）",
  "keyPoints": ["要点1：多态的定义", "要点2：三个必要条件", "要点3：底层实现原理"],
  "visualIcon": "🧠", // 请根据题目内容选择一个最贴切的 Emoji 图标（如 🔒 表示并发锁，🌳 表示树，☕ 表示Java）
  "graphData": {
    "layout": "horizontal", // "horizontal" 或 "vertical" 或 "free"
    "nodes": [
      { "id": "A", "label": "Animal", "type": "secondary" },
      { "id": "B", "label": "Dog", "type": "default" },
      { "id": "C", "label": "Cat", "type": "default" }
    ],
    "edges": [
      { "from": "B", "to": "A", "label": "extends", "dashed": false },
      { "from": "C", "to": "A", "label": "extends", "dashed": false }
    ],
    "steps": [
      {
        "text": "首先我们有一个父类 Animal",
        "activeNodes": ["A"],
        "activeEdges": []
      }
    ]
  },
  "explanation": "这道题是Java面试中非常高频的基础题..."
}

注意：针对 java_interview 题型，请根据题目的性质，在 \`graphData\`、\`comparisonData\`、\`timelineData\` 这三种图解类型中**选择最合适的一种**返回（只需要返回其中一个即可！）。
1. **graphData (节点结构图)**：适合讲解类关系、系统架构、依赖关系（如多态、设计模式）。
2. **comparisonData (对比表格)**：适合讲解两者或多者的区别（如 ArrayList vs LinkedList，TCP vs UDP）。
   格式示例：
   "comparisonData": {
     "headers": ["特性", "ArrayList", "LinkedList"],
     "rows": [
       ["底层结构", "动态数组", "双向链表"],
       ["查询效率", "O(1)", "O(n)"]
     ],
     "steps": [{ "text": "首先看底层结构...", "activeRows": [0] }, { "text": "查询效率方面...", "activeRows": [1] }]
   }
3. **timelineData (时间轴/流程)**：适合讲解生命周期、执行流程（如 Spring Bean 生命周期、类加载过程）。
   格式示例：
   "timelineData": {
     "events": [
       { "title": "加载 (Loading)", "description": "读取字节码进入内存" },
       { "title": "验证 (Verification)", "description": "校验字节码规范" }
     ],
     "steps": [{ "text": "第一步是加载...", "activeEvents": [0] }, { "text": "然后进行验证...", "activeEvents": [1] }]
   }

无论选择哪种图解类型，都必须包含 \`steps\` 数组来定义动画高亮的顺序，确保与图解中的元素（节点/行/事件）严格对应！


如果 targetType 是 "leetcode":
{
  "id": "随机生成唯一字符串",
  "type": "leetcode",
  "title": "题目编号及名称（如：1. 两数之和）",
  "description": "题目描述要求",
  "language": "${language}",
  "codeSnippet": "使用 ${language} 编写的核心解题代码片段",
  "problemReading": "读题部分的口语化配音文案（如：现在我们来看力扣第一题...）",
  "steps": [
    {
      "text": "这一步的屏幕简短显示文本（如：初始化左右指针）",
      "spokenText": "这一步的具体讲解配音文案（如：首先，我们初始化左右两个指针，分别指向数组的头和尾。）",
      "codeLines": [0, 1],
      "state": {
        "structures": [
          {
            "id": "tree1",
            "type": "tree",
            "data": [1, 2, 3, 4],
            "pointers": { "curr": 0 },
            "highlights": [0]
          },
          {
            "id": "queue1",
            "type": "array",
            "data": [1],
            "pointers": {},
            "highlights": []
          }
        ]
      }
    }
  ]
}
注意：针对 LeetCode 题型，你必须将解题思路拆分为至少 3-6 个逻辑连贯的 \`steps\` 数组，绝对不能只返回 1 个 step。每一个 \`step\` 都必须包含对应的 \`state\` 对象，且 \`state.structures\` 数组绝对不能为空！

严格遵循以下 state 生成要求：
1. \`structures\` 数组允许你在同一帧画面中展示多个数据结构（比如一棵二叉树和一个优先队列数组）。每个 structure 都需要一个唯一的 \`id\`（如 "tree1", "queue1"），以及 \`type\` ("array" 或 "tree")。
2. \`data\` 数组代表当前该数据结构的状态。例如，如果是数组题，必须填入题目示例中的具体数组元素；如果是树，填入层序遍历数组。绝对不能填空数组 []！
3. \`pointers\` 是一个对象，键是指针的名称，值是该指针在 \`data\` 数组中的索引位置。
4. \`highlights\` 是一个数组，包含需要高亮的 \`data\` 数组索引。
5. \`spokenText\`：专用于 AI 语音合成的**逐字稿**。必须遵循以下规则：
   - **说人话，语气自然**：要像一个真实的老师在讲课，可以适度加入“对吧”、“嗯”、“你看”等轻微的语气词。
   - **严禁使用数学符号缩写**：绝对不能出现 \`*\`, \`=\`, \`dp[i]\` 这种无法自然朗读的符号。必须翻译成口语，例如：“p2 乘以 2 等于 2”。
6. 最重要的是：随着 \`steps\` 的推进，\`data\`、\`pointers\` 和 \`highlights\` 的位置必须发生变化，以体现算法的执行过程！
7. \`codeLines\` 是一个数组，表示在这一步讲解中，需要高亮显示的核心代码行号（0-indexed，首行行号为0）。如果不需要高亮，可返回空数组 []。

这里有一个【丑数】题目的完整 \`steps\` 输出示例供你严格参考（请注意 data 里面是有具体数据的，pointers 是有具体索引的）：
\`\`\`json
{
  "steps": [
    {
      "text": "初始化 dp 数组。dp[0]=1 代表第一个丑数，p2, p3, p5 指针均指向索引 0。",
      "spokenText": "这是一道非常经典的动态规划题目。我们的核心思路是，使用三个指针 p2、p3、p5，它们分别代表下一步需要乘以 2、乘以 3、乘以 5 的位置。嗯，我们先初始化一个 dp 数组，第一位放入 1，并且把三个指针都指向它。",
      "codeLines": [0, 1, 2],
      "state": {
        "structures": [
          {
            "id": "dp_array",
            "type": "array",
            "data": [1],
            "pointers": { "p2": 0, "p3": 0, "p5": 0 },
            "highlights": [0]
          }
        ]
      }
    },
    {
      "text": "计算候选项: dp[p2]*2=2, dp[p3]*3=3, dp[p5]*5=5。最小值是 2，所以 dp[1]=2，并将 p2 指针后移。",
      "spokenText": "接下来，我们分别计算一下这三个指针对应的值：p2 乘以 2 等于 2，p3 乘以 3 等于 3，p5 乘以 5 等于 5。这三个数里面最小的显然是 2，对吧？所以下一个丑数就是 2，我们把 2 填入数组，并且把 p2 指针向后移动一位。",
      "codeLines": [3, 4, 5],
      "state": {
        "structures": [
          {
            "id": "dp_array",
            "type": "array",
            "data": [1, 2],
            "pointers": { "p2": 1, "p3": 0, "p5": 0 },
            "highlights": [1]
          }
        ]
      }
    }
  ]
}
\`\`\`
`;

  const userPrompt = `原始题目文本：\n${rawText}`;

  const client = createClient(config);
  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      stream: true,
    });

    return response;
  } catch (error) {
    console.error('Failed to stream parse problem with LLM:', error);
    throw new Error('LLM 解析流式请求失败，请检查 API Key 和网络连接。');
  }
}

