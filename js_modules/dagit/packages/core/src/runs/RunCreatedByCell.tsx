import {Box, Tag} from '@dagster-io/ui';
import React from 'react';
import {Link} from 'react-router-dom';

import {DagsterTag} from './RunTag';
import {runsPathWithFilters} from './RunsFilterInput';
import {RunTableRunFragment} from './types/RunTable.types';

type Props = {
  run: RunTableRunFragment;
};

export function RunCreatedByCell(props: Props) {
  const tags = props.run.tags || [];

  const backfillTag = tags.find((tag) => tag.key === DagsterTag.Backfill);
  const scheduleTag = tags.find((tag) => tag.key === DagsterTag.ScheduleName);
  const sensorTag = tags.find((tag) => tag.key === DagsterTag.SensorName);
  const user = tags.find((tag) => tag.key === DagsterTag.User);

  const ret = [];

  if (user) {
    ret.push(
      <Tag key="user" icon="account_circle">
        {user.value}
      </Tag>,
    );
  }
  if (backfillTag) {
    const link = props.run.assetSelection?.length
      ? `/overview/backfills/${backfillTag.value}`
      : runsPathWithFilters([
          {
            token: 'tag',
            value: `dagster/backfill=${backfillTag.value}`,
          },
        ]);
    ret.push(
      <div key="backfill">
        Backfill: <Link to={link}>{backfillTag.value}</Link>
      </div>,
    );
  }
  if (scheduleTag) {
    ret.push(
      <Tag icon="calendar" key="schedule">
        {scheduleTag.value}
      </Tag>,
    );
  }

  if (sensorTag) {
    ret.push(
      <Tag icon="sensors" key="sensor">
        {sensorTag.value}
      </Tag>,
    );
  }

  return <Box flex={{direction: 'column', alignItems: 'flex-start'}}>{ret}</Box>;
}