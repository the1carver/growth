import { Input as SearchContactsInput } from ".botpress/implementation/actions/searchContacts/input";
import { Input as SearchLeadsInput } from ".botpress/implementation/actions/searchLeads/input";
import { SalesforceObject } from "../types";

export const getSearchQuery = (
  objectType: SalesforceObject,
  input: SearchLeadsInput | SearchContactsInput,
  objectFields: string
): string => {
  let query = `SELECT ${objectFields} FROM ${objectType}`;
  let conditions = [];

  if (input.id) {
    conditions.push(`Id = '${input.id}'`);
  }
  if (input.name) {
    conditions.push(`Name LIKE '%${input.name}%'`);
  }
  if (input.email) {
    conditions.push(`Email = '${input.email}'`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  return query;
};
