import type { SqlQueryOutput } from '~/lib/.server/llm/database-source';

export const SQL_QUERY_CONSTRAINTS = `
<sql_query_constraints>
    You will be provided with a list of SQL queries that you can use to create components that the user needs.
    Each query will have unique Query ID, SQL query, Explanation, and Response Schema.

    IMPORTANT:
    - Always construct the Typescript type based on the response schema.
    - Choose the appropriate components to visualize the data.
    - In order to fetch data for a component just pass queryId as a prop to the DataInjectorWrapper component.
    - Do not write your own queries, just use the existing query ids.
    - The query data response is ALWAYS an array of objects. It is very important that you access the data in a proper way when connecting it to a component.
</sql_query_constraints>
`;

export const mapSqlQueriesToPrompt = (sqlQueries: SqlQueryOutput): string => `<sql_queries>
Use these SQL queries to create components:

${sqlQueries
  .map(
    (query) => `<query>
SQL: ${query.query}
Explanation: ${query.explanation}
Response Schema: ${query.responseSchema}
</query>`,
  )
  .join('\n')}
</sql_queries>`;
