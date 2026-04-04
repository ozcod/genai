import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

const tvly = tavily({
  apiKey: process.env.TAVILY_API_KEY,
});
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

export async function generate(userMessage, threadId) {
  const baseMessages = [
    {
      role: "system",
      content: `You are a smart personal assistant.
                    If you know the answer to a question, answer it directly in plain English.
                    If the answer requires real-time, local, or up-to-date information, or if you don’t know the answer, use the available tools to find it.
                    You have access to the following tool:
                    webSearch(query: string): Use this to search the internet for current or unknown information.
                    Decide when to use your own knowledge and when to use the tool.
                    Do not mention the tool unless needed.

                    Examples:
                    Q: What is the capital of France?
                    A: The capital of France is Paris.

                    Q: What’s the weather in Islamabad right now?
                    A: (use the search tool to find the latest weather)

                    Q: Who is the Prime Minister of Pakistan?
                    A: The current Prime Minister of India is Shahbaz Sharif.

                    Q: Tell me the latest IT news.
                    A: (use the search tool to get the latest news)

                    current date and time: ${new Date().toUTCString()}`,
    },
  ];

  const message = cache.get(threadId) ?? baseMessages;

  message.push({
    role: "user",
    content: userMessage,
  });

  const MaxRetries = 10;
  let count = 0;
  while (true) {
    if (count > MaxRetries) {
      return "Sorry, I'm having trouble generating a response right now. Please try again later.";
    }
    count++;
    const completions = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      temperature: 0,
      messages: message,
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

    message.push(completions.choices[0].message);

    const tool_calls = completions.choices[0].message.tool_calls;

    if (!tool_calls) {
      cache.set(threadId, message);
      return completions.choices[0].message.content;
    }

    for (const tool of tool_calls) {
      const functionName = tool.function.name;
      const functionArgs = tool.function.arguments;

      if (functionName === "webSearch") {
        const toolResult = await webSearch(JSON.parse(functionArgs));
        //   console.log("toolResult", toolResult);
        message.push({
          role: "tool",
          name: functionName,
          content: toolResult,
          tool_call_id: tool.id,
        });
      }
    }
  }
}

async function webSearch({ query }) {
  console.log(`Calling web search function ${query}`);
  const response = await tvly.search(query);
  const finalResponse = response.results
    .map((result) => result.content)
    .join("\n\n");
  // console.log("response", finalResponse);
  return finalResponse;
}
