"""
AIVIA MVP ElevenLabs Integration Service
Direct integration with ElevenLabs Conversational AI for interview agents
"""
from elevenlabs import ElevenLabs
from typing import Dict, List, Optional, Any, Union
import logging
import uuid
import asyncio
from dataclasses import dataclass


@dataclass
class AgentCreationResult:
    """Result of agent creation operation."""
    agent_id: str
    session_id: str
    success: bool
    error_message: Optional[str] = None


class ElevenLabsService:
    """
    Simple and direct ElevenLabs service for MVP interview implementation.
    Creates agents directly with hardcoded system prompts and resume as knowledge base.
    """

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("ElevenLabs API key is required")

        self.client = ElevenLabs(
            api_key=api_key,
            base_url="https://api.elevenlabs.io/"
        )
        self.logger = logging.getLogger(__name__)
        self.active_agents: Dict[str, str] = {}  # session_id -> agent_id mapping

        # Supported job roles
        self.supported_roles = {
            "SDE", "Data Analysis", "Full Stack", 
            "Backend", "Frontend", "DevOps"
        }

    async def create_interview_agent(
        self,
        session_id: str,
        role: str,
        resume_text: str,
        voice_id: str = "pNInz6obpgDQGcFmaJgB"  # Professional voice
    ) -> AgentCreationResult:
        """
        Create interview agent directly with system prompt and resume knowledge base.

        Args:
            session_id: Unique session identifier
            role: Job role (must be one of: SDE, Data Analysis, Full Stack, Backend, Frontend, DevOps)
            resume_text: Raw resume text as knowledge base
            voice_id: ElevenLabs voice ID

        Returns:
            AgentCreationResult: Result containing agent_id or error information

        Raises:
            ValueError: If role is not supported or resume_text is empty
        """
        # Validation
        if not session_id:
            return AgentCreationResult("", session_id, False, "Session ID is required")

        if role not in self.supported_roles:
            return AgentCreationResult("", session_id, False, f"Unsupported role: {role}")

        if not resume_text or not resume_text.strip():
            return AgentCreationResult("", session_id, False, "Resume text cannot be empty")

        try:
            system_prompt = self._get_hardcoded_system_prompt(role)
            knowledge_base = [resume_text.strip()]  # Clean resume text as knowledge base

            # Create agent with ElevenLabs
            agent = await self._create_agent_with_retry(
                system_prompt=system_prompt,
                knowledge_base=knowledge_base,
                voice_id=voice_id,
                role=role
            )

            # Store agent mapping
            self.active_agents[session_id] = agent.agent_id

            self.logger.info(
                f"Successfully created agent {agent.agent_id} for {role} interview (session: {session_id})"
            )

            return AgentCreationResult(
                agent_id=agent.agent_id,
                session_id=session_id,
                success=True
            )

        except Exception as e:
            error_msg = f"Agent creation failed: {str(e)}"
            self.logger.error(f"{error_msg} (session: {session_id}, role: {role})")

            return AgentCreationResult(
                agent_id="",
                session_id=session_id,
                success=False,
                error_message=error_msg
            )

    async def _create_agent_with_retry(
        self, 
        system_prompt: str, 
        knowledge_base: List[str], 
        voice_id: str,
        role: str,
        max_retries: int = 3
    ):
        """Create agent with retry logic for better reliability."""

        for attempt in range(max_retries):
            try:
                agent = self.client.conversational_ai.agents.create(
                    conversation_config={
                        "agent": {
                            "prompt": {
                                "prompt": system_prompt,
                                "knowledge_base": knowledge_base
                            },
                            "first_message": self._get_personalized_greeting(role),
                            "language": "en",
                            "voice_id": voice_id
                        }
                    }
                )
                return agent

            except Exception as e:
                if attempt == max_retries - 1:  # Last attempt
                    raise e

                self.logger.warning(f"Agent creation attempt {attempt + 1} failed: {str(e)}")
                await asyncio.sleep(1)  # Brief delay before retry

    def _get_personalized_greeting(self, role: str) -> str:
        """Generate personalized greeting based on role."""
        greetings = {
            "SDE": "Hello! I'm excited to interview you for the Software Development Engineer position. I've reviewed your resume, so let's dive into some technical questions. Can you start by telling me about a challenging algorithm or system design problem you've solved recently?",

            "Data Analysis": "Hello! I'm looking forward to interviewing you for the Data Analyst position. I've gone through your background, so let's explore your analytical skills. Can you walk me through a data analysis project where you discovered interesting insights?",

            "Full Stack": "Hello! I'm excited to discuss the Full Stack Developer role with you. Having reviewed your experience, let's talk about your end-to-end development skills. Can you describe a full-stack project you've built from scratch?",

            "Backend": "Hello! I'm pleased to interview you for the Backend Engineer position. Based on your resume, let's dive into backend development. Can you tell me about a scalable system or API you've designed recently?",

            "Frontend": "Hello! I'm looking forward to our Frontend Developer interview. I've seen your background, so let's discuss your frontend expertise. Can you describe a complex UI component or user experience challenge you've tackled?",

            "DevOps": "Hello! I'm excited to interview you for the DevOps Engineer role. Having reviewed your experience, let's talk about infrastructure and automation. Can you walk me through a CI/CD pipeline or infrastructure project you've implemented?"
        }

        return greetings.get(role, greetings["SDE"])

    def _get_hardcoded_system_prompt(self, role: str) -> str:
        """Get hardcoded system prompts for different job roles."""

        prompts = {
            "SDE": """You are an experienced Senior Software Development Engineer interviewer at a top tech company. 

            Focus on:
            - Algorithms and data structures
            - System design and architecture
            - Code quality and best practices
            - Problem-solving approach
            - Technical depth in their experience

            Ask follow-up questions based on their resume. Keep responses concise (30-60 seconds). 
            Be professional but engaging. Reference their specific projects and technologies.""",

            "Data Analysis": """You are a Senior Data Analyst interviewer with expertise in analytics and insights.

            Focus on:
            - Statistical analysis and methodologies
            - SQL and database knowledge
            - Data visualization and storytelling
            - Business problem-solving with data
            - Python/R programming skills

            Ask practical scenarios based on their background. Keep responses focused and professional.""",

            "Full Stack": """You are a Senior Full Stack Developer interviewer.

            Focus on:
            - Frontend and backend technologies
            - System integration and architecture
            - End-to-end project delivery
            - Technology stack decisions
            - Performance and scalability

            Test breadth across the stack. Reference their specific tech experience.""",

            "Backend": """You are a Senior Backend Engineer interviewer.

            Focus on:
            - Server-side architecture and APIs
            - Database design and optimization
            - System scalability and performance
            - Security best practices
            - Microservices and distributed systems

            Deep dive into backend concepts. Challenge on scalability.""",

            "Frontend": """You are a Senior Frontend Developer interviewer.

            Focus on:
            - Modern JavaScript frameworks
            - UI/UX and responsive design
            - Browser performance optimization
            - State management and architecture
            - Accessibility and user experience

            Challenge on complex UI problems and performance.""",

            "DevOps": """You are a Senior DevOps Engineer interviewer.

            Focus on:
            - CI/CD pipelines and automation
            - Infrastructure as Code
            - Container orchestration
            - Cloud platforms and monitoring
            - Security and compliance

            Test on automation and operational excellence."""
        }

        return prompts.get(role, prompts["SDE"])

    async def get_websocket_url(self, agent_id: str) -> Optional[str]:
        """Get signed WebSocket URL for real-time conversation."""
        if not agent_id:
            self.logger.error("Agent ID is required for WebSocket URL generation")
            return None

        try:
            signed_url_response = self.client.conversational_ai.get_signed_url(agent_id=agent_id)
            self.logger.info(f"Generated WebSocket URL for agent {agent_id}")
            return signed_url_response.signed_url

        except Exception as e:
            self.logger.error(f"WebSocket URL generation failed for agent {agent_id}: {str(e)}")
            return None

    async def delete_agent(self, agent_id: str) -> bool:
        """Delete agent after interview completion with cleanup."""
        if not agent_id:
            self.logger.warning("No agent ID provided for deletion")
            return False

        try:
            # Delete from ElevenLabs
            self.client.conversational_ai.delete_agent(agent_id)

            # Clean up local mapping
            session_to_remove = None
            for session_id, stored_agent_id in self.active_agents.items():
                if stored_agent_id == agent_id:
                    session_to_remove = session_id
                    break

            if session_to_remove:
                del self.active_agents[session_to_remove]

            self.logger.info(f"Successfully deleted agent {agent_id}")
            return True

        except Exception as e:
            self.logger.error(f"Agent deletion failed for {agent_id}: {str(e)}")
            return False

    def get_active_agent_count(self) -> int:
        """Get count of currently active agents."""
        return len(self.active_agents)
