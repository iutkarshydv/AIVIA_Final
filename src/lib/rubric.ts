import { Rubric } from '@/types';

export const DEFAULT_RUBRIC: Rubric = {
  criteria: [
    {
      id: 'technical',
      name: 'Technical Knowledge',
      description: 'Understanding of technical concepts, tools, and best practices',
      scale: 5,
      anchors: {
        '0': 'No understanding of technical concepts; unable to answer basic questions',
        '1': 'Very limited technical knowledge; struggles with fundamental concepts',
        '2': 'Basic understanding but lacks depth; misses important details',
        '3': 'Solid grasp of core concepts; explains with reasonable accuracy',
        '4': 'Strong technical knowledge; mentions trade-offs and edge cases',
        '5': 'Expert-level understanding; discusses nuances, alternatives, and advanced concepts',
      },
    },
    {
      id: 'problemSolving',
      name: 'Problem Solving',
      description: 'Ability to analyze problems and devise effective solutions',
      scale: 5,
      anchors: {
        '0': 'Cannot approach problem systematically; no clear thought process',
        '1': 'Struggles to break down problems; jumps to conclusions',
        '2': 'Basic problem-solving but misses key considerations',
        '3': 'Methodical approach; considers multiple angles',
        '4': 'Strong analytical skills; evaluates trade-offs systematically',
        '5': 'Exceptional problem-solving; considers edge cases, scalability, and alternatives',
      },
    },
    {
      id: 'examples',
      name: 'Real-World Examples',
      description: 'Ability to provide concrete examples from past experience',
      scale: 5,
      anchors: {
        '0': 'No relevant examples; purely theoretical responses',
        '1': 'Vague or generic examples with little detail',
        '2': 'Provides examples but lacks specificity or relevance',
        '3': 'Clear examples with reasonable detail and relevance',
        '4': 'Strong, specific examples demonstrating direct experience',
        '5': 'Compelling examples with measurable outcomes and lessons learned',
      },
    },
    {
      id: 'communication',
      name: 'Communication',
      description: 'Clarity, structure, and effectiveness of verbal communication',
      scale: 5,
      anchors: {
        '0': 'Incoherent or impossible to follow',
        '1': 'Very unclear; frequent tangents and confusion',
        '2': 'Somewhat unclear; needs prompting to stay on track',
        '3': 'Clear and understandable; organized thoughts',
        '4': 'Very clear and well-structured; easy to follow',
        '5': 'Exceptionally articulate; concise, engaging, and persuasive',
      },
    },
    {
      id: 'cultureFit',
      name: 'Culture Fit',
      description: 'Alignment with team values, collaboration, and work style',
      scale: 5,
      anchors: {
        '0': 'Major red flags; misalignment with core values',
        '1': 'Significant concerns about fit',
        '2': 'Some concerns but not dealbreakers',
        '3': 'Reasonable fit; no major concerns',
        '4': 'Strong alignment with team culture',
        '5': 'Exceptional fit; embodies team values and would elevate culture',
      },
    },
    {
      id: 'overall',
      name: 'Overall Assessment',
      description: 'Holistic evaluation considering all factors',
      scale: 5,
      anchors: {
        '0': 'Not qualified; would not recommend proceeding',
        '1': 'Significantly below requirements',
        '2': 'Below expectations but has some potential',
        '3': 'Meets basic requirements; acceptable candidate',
        '4': 'Strong candidate; exceeds expectations',
        '5': 'Outstanding candidate; hire immediately',
      },
    },
  ],
  outputFormat: '{"questionId":"string","technical":0-5,"communication":0-5,"problemSolving":0-5,"examples":0-5,"cultureFit":0-5,"overall":0-5,"rationale":"string"}',
  instructions: `After each candidate response, you MUST return a JSON evaluation block in EXACTLY this format:
{"questionId":"q1","technical":3,"communication":4,"problemSolving":3,"examples":2,"cultureFit":4,"overall":3,"rationale":"Candidate demonstrated solid understanding but lacked specific examples..."}

Rules:
1. Always return valid JSON matching the exact format above
2. All scores must be integers between 0 and 5
3. QuestionId should increment (q1, q2, q3, etc.)
4. Rationale should be 1-3 sentences explaining the scores
5. After returning the JSON, provide verbal feedback to the candidate and ask the next question`,
};

export const AGENT_SYSTEM_PROMPT = `You are an expert technical interviewer conducting a structured interview. Your role is to:

1. Ask targeted questions based on the job description and candidate's resume
2. Listen carefully to responses and ask relevant follow-up questions
3. Evaluate each response objectively using the provided rubric
4. Adapt question difficulty based on candidate performance
5. Create a comfortable yet professional interview atmosphere

CRITICAL INSTRUCTIONS:
- After EVERY candidate response, emit a JSON evaluation block following the exact rubric format
- Keep questions clear, focused, and job-relevant
- Allow candidates to think before answering
- Provide brief encouraging feedback after evaluations
- Complete the interview in 20-30 minutes (approximately 8-12 questions)
- Be respectful of interruptions and adapt gracefully
- Focus on understanding depth of knowledge, not just surface-level answers

EVALUATION APPROACH:
- Score honestly and consistently against rubric anchors
- Consider both technical accuracy and communication quality
- Value specific examples over theoretical knowledge
- Note growth potential and learning mindset
- Be fair but discerning in your assessment

At the end of the interview, provide a final summary with overall recommendation.`;
