import unittest

from minimal_agent import MinimalAgent, build_tools


class MinimalAgentTests(unittest.TestCase):
    def test_routes_calculation_request_to_calculator_tool(self):
        agent = MinimalAgent(build_tools())

        response = agent.run("请帮我计算 18 + 24")

        self.assertEqual(response.tool_name, "calculator")
        self.assertEqual(response.tool_result, "42")
        self.assertIn("42", response.final_answer)

    def test_routes_project_request_to_project_lookup_tool(self):
        agent = MinimalAgent(build_tools())

        response = agent.run("这个总集项目的核心管理动作是什么？")

        self.assertEqual(response.tool_name, "project_lookup")
        self.assertIn("范围确认", response.tool_result)
        self.assertIn("进度跟踪", response.final_answer)


if __name__ == "__main__":
    unittest.main()
