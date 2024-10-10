"use server";

import { getSelfPerson, getSelfPersonId } from "@/app/utils/airtable";
import { getSession } from "@/app/utils/auth";
import Airtable from "airtable";

const peopleTableName = "people";
const shipsTableName = "ships";

const base = () => {
  const baseId = process.env.BASE_ID;
  if (!baseId) throw new Error("No Base ID env var set");

  return Airtable.base(baseId);
};

export interface Ship {
  id: string; // The Airtable row's ID.
  title: string;
  repoUrl: string;
  deploymentUrl?: string;
  readmeUrl: string;
  screenshotUrl: string;
  // doubloonsPaid?: number;
  hours: number;
  voteRequirementMet: boolean;
  doubloonPayout: number;
}

export async function getUserShips(slackId: string): Promise<Ship[]> {
  console.log("getting ships of", slackId);
  const ships: Ship[] = [];
  const personId = await getSelfPerson(slackId).then((p) => p.id);

  return new Promise((resolve, reject) => {
    base()(shipsTableName)
      .select({
        filterByFormula: `AND(
        TRUE(),
        '${slackId}' = {entrant__slack_id},
        {project_source} = 'low_skies'
        )`,
      })
      .eachPage(
        (records, fetchNextPage) => {
          records.forEach((record) => {
            const entrant = record.get("entrant") as string[];
            if (entrant && entrant.includes(personId)) {
              ships.push({
                id: record.id,
                title: record.get("title") as string,
                repoUrl: record.get("repo_url") as string,
                deploymentUrl: record.get("deploy_url") as string,
                readmeUrl: record.get("readme_url") as string,
                screenshotUrl: record.get("screenshot_url") as string,
                // rating: record.get("rating") as number,
                hours: record.get("hours") as number,
                voteRequirementMet: Boolean(
                  record.get("vote_requirement_met"),
                ) as boolean,
                doubloonPayout: record.get("doubloon_payout") as number,
              });
            }
          });
          fetchNextPage();
        },
        (err) => {
          console.error(ships);
          return err ? reject(err) : resolve(ships);
        },
      );
  });
}

export async function createShip(formData: FormData) {
  const session = await getSession();
  if (!session) {
    const error = new Error(
      "Tried to submit a ship with no Slack OAuth session",
    );
    console.log(error);
    throw error;
  }

  const slackId = session.payload.sub;
  const entrantId = await getSelfPerson(slackId).then((p) => p.id);

  console.log(formData, slackId, entrantId);

  base()(shipsTableName).create(
    [
      {
        // @ts-expect-error No overload matches this call - but it does
        fields: {
          title: formData.get("title"),
          hours: Number(formData.get("hours")),
          entrant: [entrantId],
          repo_url: formData.get("repo_url"),
          readme_url: formData.get("readme_url"),
          deploy_url: formData.get("deploy_url"),
          screenshot_url: formData.get("screenshot_url"),
        },
      },
    ],
    function (err: Error, records: any) {
      if (err) {
        console.error(err);
        return;
      }
      if (!records) {
        console.error("No records!");
      } else {
        records.forEach((record: any) => {
          console.log(record.getId());
        });
      }
    },
  );
}

export async function updateShip(ship: Ship) {
  const session = await getSession();
  if (!session) {
    const error = new Error(
      "Tried to submit a ship with no Slack OAuth session",
    );
    console.log(error);
    throw error;
  }

  console.log("updating!", ship);

  base()(shipsTableName).update(
    [
      {
        id: ship.id,
        fields: {
          title: ship.title,
          repo_url: ship.repoUrl,
          readme_url: ship.readmeUrl,
          deploy_url: ship.deploymentUrl,
          screenshot_url: ship.screenshotUrl,
        },
      },
    ],
    function (err: Error, records: any) {
      if (err) {
        console.error(err);
        return;
      }
      if (!records) {
        console.error("No records!");
      } else {
        records.forEach((record: any) => {
          console.log(record.getId());
        });
      }
    },
  );
}
