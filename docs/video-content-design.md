# 视频内容讲解方案设计

> 目标：让观众看完视频后能真正理解知识点。
> 两种题型侧重点不同，分开设计。

---

## 一、算法题解（图解算法）

### 核心教学逻辑
算法题的观众期望：**看懂题目 → 理清思路 → 看清每一步 → 掌握复杂度 → 记住套路**

### 五段式讲解结构

```
┌──────────────────────────────────────────────────────┐
│ Phase 1   读题破题     ~15% 时长    配音读题 + 题目展示 │
│ Phase 2   思路解析     ~15% 时长    方法论 + 核心洞察    │
│ Phase 3   分步推演     ~50% 时长    核心动画 + 代码同步   │
│ Phase 4   复杂度分析   ~10% 时长    时空复杂度分析        │
│ Phase 5   总结回顾     ~10% 时长    要点 + 应用场景      │
└──────────────────────────────────────────────────────┘
```

#### Phase 1：读题破题

**屏幕上展示：**
- 题目标题（LeetCode 风格编号 + 标题）
- 题目描述（简洁版，3-5 行）
- 示例输入/输出（高亮显示）

**配音内容（problemReading）：**
- 口语化读题："现在我们来看力扣第 X 题，题目要求... 举个例子..."
- 强调核心问题：到底是求什么？用什么数据结构？

**AI Prompt 指令要求：**
- `problemReading` 控制在 80-150 字，口语化
- 必须包含：题目类型（数组/树/DP等）+ 核心目标 + 示例简述

#### Phase 2：思路解析

**屏幕上展示：**
- 核心思路标题（如「双指针法」或「滑动窗口」）
- 方法论一句话总结（如「用两个指针从两端向中间遍历」）
- 如果适用：关键洞察的对比（如「暴力 O(n²) → 优化 O(n)」）

**当前模板限制：** 没有独立的"思路解析"阶段。当前是读题结束直接跳入 steps。
**建议新增字段 `approachOverview`：**

```typescript
approachOverview: {
  methodName: string;          // 如 "双指针法", "动态规划"
  coreInsight: string;         // 核心洞察，一句话
  whyBetter?: string;          // 为何优于暴力解（可选）
}
```

**UI 渲染建议：** 在代码区上方或右侧可视化区顶部，用一个高亮卡片展示 3 秒。

#### Phase 3：分步推演（核心部分）

每个 step 应该对应 **一条不可再分的操作**。

**步骤粒度原则：**
- ✅ 好示例：「将 left 指针右移一位」
- ✅ 好示例：「比较 nums[mid] 与 target」
- ❌ 差示例：「初始化指针并开始循环比较」（包含了多个动作）

**每个 step 的数据要求：**

```typescript
{
  "text": "口语化讲解（TTS 用）",
  "spokenText": "净化版（如果有代码符号）",
  "state": {
    "structures": [
      // 1-2 个数据结构，展示当前状态
    ]
  },
  "codeLines": [3, 4, 5],   // 正在执行的代码行（0-indexed）
  "highlightReason": "指针移动"  // 新增：高亮的原因标签
}
```

**画面对应关系：**
```
┌─────────────────────────────────────────┐
│ 左侧 (35%)          │ 右侧 (65%)           │
│ ┌─────────────────┐ │ ┌──────────────────┐ │
│ │ 题目信息 (固定)   │ │ │ 数据结构动画 (70%) │ │
│ │ 代码区 (打字机)   │ │ │ 当前操作可视化     │ │
│ │ 高亮当前行        │ │ │                  │ │
│ │                  │ │ ├──────────────────┤ │
│ │                  │ │ │ 思路推演 (30%)    │ │
│ │                  │ │ │ step.text 字幕    │ │
│ └─────────────────┘ │ └──────────────────┘ │
└─────────────────────────────────────────┘
```

**步骤数建议：** 简单题 4-6 步，中等题 6-10 步，难题 8-12 步。

#### Phase 4：复杂度分析

**新增字段 `complexity`：**

```typescript
complexity: {
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)",
  briefExplanation: "每个元素只遍历一次，额外空间仅两个指针" // 口语化
}
```

**UI 渲染建议：** 在代码区底部或右侧底部，用两个标签样式展示。

#### Phase 5：总结回顾

**新增字段 `summary`：**

```typescript
summary: "这道题的核心是双指针技巧，当数组有序且需要查找一对元素时，优先考虑双指针。类似的题目还有三数之和、盛最多水容器。"
```

**UI 渲染建议：** 视频最后 3-4 秒，全屏展示总结卡片。

### AI Prompt 优化要点（算法）

```text
当前 prompt 的问题：
1. 没有要求 steps 的粒度控制 → 步骤粒度差异大
2. 没有要求 approachOverview → 缺少思路解析
3. 没有要求 complexity → 缺乏复杂度分析
4. 对 codeSnippet 的要求不够具体

优化方向：
1. 明确要求 codeSnippet 必须有行号可追踪
2. 要求 steps 数量按题目难度分级
3. 要求每个 step 的 codeLines 准确指向关键行
4. 新增 approachOverview / complexity / summary 字段
```

---

## 二、面试题解

### 核心教学逻辑
面试题观众的期望：**知道考什么 → 理解概念 → 看清结构 → 记住应用**

### 五段式讲解结构

```
┌──────────────────────────────────────────────────────┐
│ Phase 1   问题引入     ~10% 时长    展示问题 + 考点说明  │
│ Phase 2   核心概念     ~25% 时长    keyPoints 逐条展开   │
│ Phase 3   可视化深解   ~35% 时长    Graph/Compare/Timeline│
│ Phase 4   实战拓展     ~20% 时长    面试追问 + 避坑指南    │
│ Phase 5   金句总结     ~10% 时长    一句话记住这个考点     │
└──────────────────────────────────────────────────────┘
```

#### Phase 1：问题引入

**屏幕上展示：**
- 面试问题原文（大号字体）
- 考点标签（如「⭐ 高频题」「底层原理」）
- 一句话说明这道题在考察什么

**配音内容：**
- 引入问题背景
- 指出考察点（"这道题主要考察你对 X 的理解"）

**当前已支持：** `question` + `title` 字段。建议增强 title 格式。

#### Phase 2：核心概念展开

**当前 keyPoints 的问题：**
- 没有分层：3-5 条 keyPoint 是平级的，没有主次关系
- 没有锚定：每条 keyPoint 不与后续 visualization 关联

**优化建议：引入分层 keyPoints**

```typescript
keyPoints: [
  {
    text: "多态是同一个行为具有多个不同表现形式的能力",  // 原文本
    level: "core",       // core | detail | advanced
    visualHint?: "graph" // 提示：这条考点适合用图表示
  },
  ...
]
```

或者简化方案——保持 `keyPoints: string[]`，但在 prompt 中要求按"核心→原理→应用"分层排列：
- 第 0 条：一句话定义（最核心）
- 第 1-2 条：底层原理
- 第 3-4 条：应用场景/注意事项

**UI 渲染建议：** 每条 keyPoint 使用不同的视觉权重——第一条最大，后续递减。

#### Phase 3：可视化深解

这是面试题的精华部分。**可视化类型的选择策略：**

| 知识点类型 | 推荐可视化 | 示例 |
|-----------|-----------|------|
| 结构关系（继承/实现） | `graphData` | 类继承图、接口实现关系 |
| 对比辨析（A vs B） | `comparisonData` | ArrayList vs LinkedList |
| 流程/生命周期 | `timelineData` | Spring Bean 生命周期 |
| 纯概念（无结构） | fallback 图文 | 多态的定义解释 |

**GraphData 优化要求：**
- 节点数 3-8 个，过多则拆分子图
- edges 必须带 label（如 "extends", "implements"）
- steps.text 必须和对应 keyPoint 呼应

**ComparisonData 优化要求：**
- headers 必须清晰区分对比维度
- 推荐 3-5 行数据，2-3 列对比
- steps 中的 activeRows 逐行展开，不要一次性全亮

**TimelineData 优化要求：**
- events 控制在 3-6 个阶段
- 每个 event 的 title 在 4 字以内
- steps 按阶段推进

#### Phase 4：实战拓展

**新增字段 `interviewTips`：**

```typescript
interviewTips: {
  commonMistake: "容易忽略多态的运行时行为",     // 常见错误
  followUp: "静态多态和动态多态的区别是什么?",      // 可能的追问
  realWorld: "Spring AOP 就是多态的典型应用"      // 实际应用场景
}
```

**UI 渲染建议：** 在 explanation 区域底部，用三个不同的卡片/色块展示。

#### Phase 5：金句总结

**新增字段 `oneLiner`：**

```typescript
oneLiner: "多态就是『父类引用，子类行为』——编译看左边，运行看右边。"
```

**UI 渲染建议：** 视频最后 3 秒，全屏大字展示，作为记忆锚点。

### 现有字段优化

**`explanation` 当前问题：**
- 150-300 字的纯文本
- 没有分段标记 → 模板只能整体 PPT 滚动
- 读起来容易疲劳

**优化方案：要求 AI 使用 Markdown 段落（用换行分隔），模板据此做分段动画：**

```text
# 当前 prompt 中的 instructions：
"explanation": "口语化讲解文案，150-300字"

# 优化后：
"explanation": [
  "第一段：讲核心定义（30-50字）",
  "第二段：讲底层原理（50-80字）",
  "第三段：讲实际应用（50-80字）"
]
```

这样模板可以逐段淡入，而不是整体滚动。

### AI Prompt 优化要点（面试）

```text
当前 prompt 的问题：
1. keyPoints 散列平铺，没有分层
2. explanation 单段长文本 → 模板只能 PPT 滚动
3. 没有 interviewTips → 缺少实战视角
4. 没有 oneLiner → 缺少记忆锚点
5. 可视化可选但无指引 → AI 可能不生成任何可视化

优化方向：
1. keyPoints 要求按"核心→原理→应用"顺序排列
2. explanation 改为三段数组，每段 30-80 字
3. 新增 interviewTips 字段
4. 新增 oneLiner 字段
5. 明确要求至少选择一种可视化（graph/comparison/timeline）
   如果题目不适合当前三种可视化，用 graphData 做一个简单结构图
```

---

## 三、预期数据样例

### 算法题解：两数之和 (Two Sum)

```json
{
  "type": "leetcode",
  "title": "1. 两数之和",
  "description": "给定一个整数数组 nums 和一个整数目标值 target，请在该数组中找出和为目标值的两个整数，并返回它们的下标。",
  "codeSnippet": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[]{map.get(complement), i};\n            }\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}",
  "language": "java",
  "problemReading": "现在我们来看力扣第一题：两数之和。给定一个数组和一个目标值，需要找到两个数，使它们的和等于目标值，返回它们的下标。比如数组 [2,7,11,15]，target 是 9，那么答案就是 0 和 1。",
  "approachOverview": {
    "methodName": "哈希表法",
    "coreInsight": "遍历数组时，将每个数存入哈希表，后面的数在表中查询差值是否存在",
    "whyBetter": "暴力法 O(n²) → 哈希表 O(n)，空间换时间"
  },
  "steps": [
    {
      "text": "创建一个空的哈希表，用来存储已经访问过的数字和它们的下标。",
      "state": {
        "structures": [
          { "id": "array", "type": "array", "data": [2, 7, 11, 15], "pointers": { "i": 0 }, "highlights": [0] },
          { "id": "hashmap", "type": "array", "data": [], "pointers": {}, "highlights": [] }
        ]
      },
      "codeLines": [2, 3]
    },
    {
      "text": "遍历第一个元素 2，计算差值 target - 2 = 7。哈希表为空，没有 7，将 2 和它的下标 0 存入哈希表。",
      "state": {
        "structures": [
          { "id": "array", "type": "array", "data": [2, 7, 11, 15], "pointers": { "i": 0 }, "highlights": [0] },
          { "id": "hashmap", "type": "array", "data": ["2→0"], "pointers": {}, "highlights": [0] }
        ]
      },
      "codeLines": [4, 5, 6, 9]
    },
    {
      "text": "遍历第二个元素 7，计算差值 target - 7 = 2。哈希表中有 2！找到答案，返回下标 [0, 1]。",
      "state": {
        "structures": [
          { "id": "array", "type": "array", "data": [2, 7, 11, 15], "pointers": { "i": 1 }, "highlights": [0, 1] },
          { "id": "hashmap", "type": "array", "data": ["2→0"], "pointers": {}, "highlights": [] }
        ]
      },
      "codeLines": [4, 5, 6, 7, 8]
    }
  ],
  "complexity": {
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(n)",
    "briefExplanation": "只遍历一次数组，哈希表的查找是 O(1)"
  },
  "summary": "两数之和是哈希表优化思想的经典入门。当遇到『找配对』问题，优先考虑用哈希表记录已访问数据。"
}
```

### 面试题解：Java 多态

```json
{
  "type": "java_interview",
  "title": "Java 多态机制详解",
  "question": "什么是多态？它的实现机制是什么？",
  "keyPoints": [
    "多态是同一个行为具有多个不同表现形式的能力",
    "三个必要条件：继承、重写、父类引用指向子类对象",
    "底层原理：动态绑定通过方法表（Method Table）实现",
    "实际应用中，多态让代码更灵活、可扩展"
  ],
  "graphData": {
    "layout": "horizontal",
    "nodes": [
      { "id": "Animal", "label": "Animal", "type": "default" },
      { "id": "Dog", "label": "Dog", "type": "default" },
      { "id": "Cat", "label": "Cat", "type": "default" },
      { "id": "makeSound", "label": "makeSound()", "type": "secondary" }
    ],
    "edges": [
      { "from": "Animal", "to": "Dog", "label": "extends", "dashed": false },
      { "from": "Animal", "to": "Cat", "label": "extends", "dashed": false },
      { "from": "Animal", "to": "makeSound", "label": "has", "dashed": true }
    ],
    "steps": [
      { "text": "Animal 是父类，定义了 makeSound 方法", "activeNodes": ["Animal", "makeSound"], "activeEdges": [] },
      { "text": "Dog 和 Cat 继承 Animal，各自重写 makeSound", "activeNodes": ["Dog", "Cat"], "activeEdges": [{"from": "Animal", "to": "Dog"}, {"from": "Animal", "to": "Cat"}] },
      { "text": "运行时，实际调用的是子类的方法——这就是多态", "activeNodes": ["Animal", "Dog", "Cat", "makeSound"], "activeEdges": [] }
    ]
  },
  "explanation": [
    "多态是指同一个方法调用，由于对象实际类型不同，表现出不同的行为。它是面向对象三大特性之一，也是框架设计的基石。",
    "底层通过方法表实现。JVM 在类加载时为每个类建立虚方法表，运行时根据对象实际类型查找对应的方法入口，这就是动态绑定。",
    "在实际开发中，多态让代码面向抽象编程。比如 Spring 的依赖注入，就是利用多态实现松耦合。"
  ],
  "interviewTips": {
    "commonMistake": "混淆重载（Overload）与重写（Override），重载是编译时多态，重写是运行时多态",
    "followUp": "成员变量、静态方法、私有方法是否能被重写？它们的调用机制是什么？",
    "realWorld": "Spring AOP 代理模式、MyBatis 接口代理、集合框架 List/Set 都是多态的典型应用"
  },
  "oneLiner": "编译看左边类型，运行看右边对象——父类引用，子类行为。"
}
```

---

## 四、后续轮次实施清单

### 第一轮：Prompt + 数据结构

| 文件 | 改动 |
|------|------|
| `src/types/problem.ts` | 添加 `approachOverview`、`complexity`、`summary` 到 `LeetCodeProblemData` |
| `src/types/problem.ts` | 添加 `interviewTips`、`oneLiner` 到 `JavaInterviewProblemData` |
| `src/types/problem.ts` | `explanation` 改为 `string[]`（数组分段） |
| `src/plugins/leetcode/prompt.ts` | 重写 system prompt，加入五段式指令 |
| `src/plugins/java-interview/prompt.ts` | 重写 system prompt，加入五段式指令 |

### 第二轮：模板渲染

| 文件 | 改动 |
|------|------|
| `src/templates/LeetCodeTemplate.tsx` | 新增 Phase 2（思路卡片）、Phase 4（复杂度标签）、Phase 5（总结卡片） |
| `src/templates/JavaInterviewTemplate.tsx` | 新增 Phase 4（面试技巧卡片）、Phase 5（金句卡片） |
| `src/templates/JavaInterviewTemplate.tsx` | explanation 改为逐段淡入替代 PPT 滚动 |

### 第三轮：编辑器

| 文件 | 改动 |
|------|------|
| `src/components/editor/ProgrammingEditor.tsx` | 新增 approachOverview、complexity、summary 编辑字段 |
| `src/components/editor/ProblemEditor.tsx` | 新增 interviewTips、oneLiner 编辑字段 |
| `src/components/editor/ProblemEditor.tsx` | explanation 改为多行文本框 |
