from backend.agents.base import get_contextual_mock_response

test_cases = [
    ("Create a launch strategy for an AI shopping app.", "Reviewer Agent"),
    ("Create a launch strategy for an AI study app.", "Reviewer Agent"),
    ("Research competitors for an AI note-taking app.", "Reviewer Agent"),
    ("Find market opportunities for a B2B SaaS pricing optimization dashboard.", "Reviewer Agent")
]

for prompt, role in test_cases:
    input_data = f"Founder Startup Idea: {prompt}"
    output = get_contextual_mock_response(role, input_data)
    print(f"Prompt: {prompt}")
    print(f"Niche Output Title: {output.splitlines()[0] if output else 'None'}")
    print("-" * 50)
