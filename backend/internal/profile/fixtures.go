package profile

import "github.com/example/neural-synthesis/backend/internal/auth"

const demoAvatarURL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCy745EVMp5XoyoOkKwJTNSvKHLWV9l3X59lAwOdlMcGY6dqPAoMLq6OWnthefp2SVr9aq7UovtqFWemskBonMG79b8pxRPSj__l8HzA2DaG94FOjnFzGCubuQ9ISmcYqwbtMOHPSTZEM1KhgPfkRCJiFR4OPwcXU-og7I1LHLzr9tQ18KdKZy1dbNxkr29757yZeEd3ItWvPQgTPCiAFG3ATnLeZqCL_F4o-kxuQ2ACCtJ4TpGJSIE"

var demoProfile = Profile{
	Headline:     "陈傲 (Alex Chen)",
	Subheadline:  "首席 AI 工程师 // 全栈系统架构师",
	Quote:        "将生物学意图与合成智能相融合",
	Email:        "alex@neural_log.ai",
	Location:     "硅谷，加利福尼亚",
	Availability: "接受新项目",
	AvatarURL:    demoAvatarURL,
	Metrics: []Metric{
		{Label: "代码行数", Value: "1.2M+", Color: "primary"},
		{Label: "训练 Epochs", Value: "50k+", Color: "secondary"},
		{Label: "部署 Agent", Value: "120+", Color: "tertiary"},
		{Label: "推理成本优化", Value: "-45%", Color: "success"},
	},
	Skills: []SkillCategory{
		{
			Category: "AI 核心",
			Icon:     "psychology",
			Color:    "secondary",
			Items: []SkillItem{
				{Name: "Python / PyTorch", SyncRate: 98, Tags: []string{"CUDA", "Distributed Training", "Kernels"}},
				{Name: "Agent 开发 (LangChain)", SyncRate: 95, Tags: []string{"AutoGPT", "Multi-Agent"}},
			},
			MasteryNote: "大规模语言模型分布式预训练与推理优化",
		},
		{
			Category: "全栈",
			Icon:     "dns",
			Color:    "tertiary",
			Items: []SkillItem{
				{Name: "Go / Microservices", SyncRate: 96, Tags: []string{"gRPC", "K8s", "Redis"}},
				{Name: "TS / React / Node", SyncRate: 90, Tags: []string{"Next.js", "WebSockets"}},
			},
			MasteryNote: "高并发实时数据流处理与云原生架构演进",
		},
		{
			Category: "产品 & 设计",
			Icon:     "design_services",
			Color:    "primary",
			Items: []SkillItem{
				{Name: "LLM UX / Prompt Eng", SyncRate: 97, Tags: []string{"Chain-of-Thought", "RAG"}},
				{Name: "AI 产品策略", SyncRate: 89, Tags: []string{"Market Fit", "Agentic Ops"}},
			},
			MasteryNote: "以智能体为核心的下一代人机交互范式定义",
		},
	},
	Projects: []Project{
		{
			Title:    "NeuralSentinel V4",
			Version:  "v4.2.0",
			Icon:     "security",
			Summary:  "高性能分布式威胁检测模型，针对边缘计算环境深度优化。",
			Logic:    "采用知识蒸馏技术将大型 Transformer 压缩至轻量级边缘模型，结合 Go 编写的高并发数据采集引擎。",
			Tech:     []string{"PyTorch", "TensorRT", "Go", "eBPF"},
			Highlight: "secondary",
			Achievement: "推理延迟降低 40% (20ms -> 12ms)",
		},
		{
			Title:    "Neural UI",
			Version:  "v1.5.0",
			Icon:     "web_asset",
			Summary:  "专为 Agentic Workflows 设计的前端组件库与设计系统。",
			Logic:    "基于 React Server Components 构建，实现流式 Token 渲染优化与智能体思维链 (CoT) 的可视化组件。",
			Tech:     []string{"React 18", "Tailwind", "Framer Motion", "Zustand"},
			Highlight: "primary",
			Achievement: "Agent UI 开发速度提升 60%",
		},
		{
			Title:    "AgentMarket",
			Version:  "v2.1.5",
			Icon:     "storefront",
			Summary:  "去中心化的 AI 智能体交易市场，支持自动 API 路由。",
			Logic:    "利用智能合约处理 Agent 授权，后端采用 Node.js 集群配合 LangChain 实现动态 Prompt 注入与计费。",
			Tech:     []string{"Solidity", "Node.js", "LangChain", "PostgreSQL"},
			Highlight: "tertiary",
			Achievement: "活跃智能体部署超 10,000+",
		},
	},
	Timeline: []TimelineEntry{
		{DateRange: "2023 - 至今", Role: "AI 产品设计负责人 @ Synth_Corp", Tags: []string{"AI UI/UX", "产品策略"}, Bullets: []string{"领导多模态交互界面的设计与开发工作。", "制定 Agentic 系统的产品迭代路线图。", "统筹全栈工程团队与设计团队协同，落地 Neural UI。"}, Marker: "primary-dot"},
		{DateRange: "2021 - 2023", Role: "首席 AI 架构师 @ Neural Corp", Tags: []string{"工业级大模型部署", "分布式系统"}, Bullets: []string{"架构并扩展了万卡级别的分布式 LLM 推理集群。", "领导 'Project Aegis' 的开发，一个高度自主的 DevOps Agent。", "研发自定义 CUDA 算子，在不损失精度的情况下将核心模型延迟降低 45%。"}, Marker: "primary-dot"},
		{DateRange: "2021", Role: "MS in AI @ Stanford University", Tags: nil, Bullets: []string{"研究方向：多模态表征学习与强化学习。", "系统核心升级完成，知识库扩容成功。"}, Marker: "secondary-diamond"},
		{DateRange: "2019 - 2021", Role: "全栈开发工程师 @ CyberTech", Tags: []string{"微服务架构", "实时数据处理"}, Bullets: []string{"架构了用于实时威胁检测的高并发 React/Node.js 仪表板。", "实现并维护服务于每日 1000 万次请求的 GraphQL API 层。", "主导将核心遗留单体架构平滑过渡到基于 Go 的云原生微服务体系。"}, Marker: "tertiary-dot"},
		{DateRange: "2019", Role: "BS in CS @ MIT", Tags: nil, Bullets: []string{"基础架构模块初始化完成。", "算法与数据结构基底烧录完毕。"}, Marker: "outline-diamond"},
	},
}

// ForUser returns the demo profile for any authenticated user (demo behavior).
func ForUser(_ auth.User) Profile {
	return demoProfile
}