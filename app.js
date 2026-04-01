import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  const messages = [
    {
      role: "system",
      content: `You are a smart assistant that helps users with their questions.
          You have access to the following tools:
          1. webSearch({query}:{query:string}) // Search the web for the given query and return the results from internet.
          Always use the tool when you don't know the answer to a question.`,
    },
    {
      role: "user",
      content: "When was iphone 17 released?",
    },
  ];
  const completions = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0,
    messages: messages,
    tools: [
      {
        type: "function",
        function: {
          name: "webSearch",
          description:
            "Search the web for the given query and return the results from internet.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to perform search on",
              },
            },
            required: ["query"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });

  const tool_calls = completions.choices[0].message.tool_calls;
  if (!tool_calls) {
    // console.log(`Assistant: ${completions.choices[0].message.content}`);
    return;
  }

  for (const tool of tool_calls) {
    const functionName = tool.function.name;
    const functionArgs = tool.function.arguments;

    if (functionName === "webSearch") {
      const toolResult = await webSearch(JSON.parse(functionArgs));
      //   console.log("toolResult", toolResult);
    }
  }

  console.log(JSON.stringify(completions.choices[0].message, null, 2));
}
main();

async function webSearch({ query }) {
  //   console.log(`Calling tool function ${query}`);
  const response = await tvly.search(query);
  const finalResponse = response.results
    .map((result) => result.content)
    .join("\n\n");
  console.log("response", finalResponse);
  return finalResponse;
}
