import {gql, useQuery} from '@apollo/client';
import {
  BaseTag,
  Body2,
  Box,
  ButtonLink,
  Icon,
  MenuItem,
  MiddleTruncate,
  NonIdealState,
  Subheading,
  Subtitle2,
  Tag,
  TagSelectorContainer,
  TagSelectorDefaultTagTooltipStyle,
  TagSelectorWithSearch,
  colorAccentGray,
  colorAccentGreen,
  colorBackgroundGray,
  colorTextLight,
} from '@dagster-io/ui-components';
import * as React from 'react';
import styled from 'styled-components';

import {ErrorWrapper} from '../../app/PythonErrorInfo';
import {formatElapsedTimeWithMsec} from '../../app/Util';
import {Timestamp} from '../../app/time/Timestamp';
import {DimensionPartitionKeys} from '../../graphql/types';
import {AnchorButton} from '../../ui/AnchorButton';
import {numberFormatter} from '../../ui/formatters';
import {AssetKey} from '../types';
import {AssetViewDefinitionNodeFragment} from '../types/AssetView.types';

import {StatusDot} from './AutomaterializeLeftPanel';
import {AutomaterializeRunsTable} from './AutomaterializeRunsTable';
import {
  GET_EVALUATIONS_QUERY,
  GET_EVALUATIONS_SPECIFIC_PARTITION_QUERY,
} from './GetEvaluationsQuery';
import {PolicyEvaluationTable} from './PolicyEvaluationTable';
import {
  FullPartitionsQuery,
  FullPartitionsQueryVariables,
} from './types/AutomaterializeMiddlePanel.types';
import {
  AssetConditionEvaluationRecordFragment,
  GetEvaluationsQuery,
  GetEvaluationsQueryVariables,
  GetEvaluationsSpecificPartitionQuery,
  GetEvaluationsSpecificPartitionQueryVariables,
} from './types/GetEvaluationsQuery.types';

interface Props {
  assetKey: AssetKey;
  selectedEvaluationId: number | undefined;
  selectedEvaluation?: AssetConditionEvaluationRecordFragment;
  definition?: AssetViewDefinitionNodeFragment | null;
}

const emptyArray: any[] = [];

export const AutomaterializeMiddlePanel = (props: Props) => {
  const {
    assetKey,
    selectedEvaluationId,
    selectedEvaluation: _selectedEvaluation,
    definition,
  } = props;

  const [selectedPartition, setSelectPartition] = React.useState<string | null>(null);

  // We receive the selected evaluation ID and retrieve it here because the middle panel
  // may be displaying an evaluation that was not retrieved at the page level for the
  // left panel, e.g. as we paginate away from it, we don't want to lose it.
  const {data, loading, error} = useQuery<GetEvaluationsQuery, GetEvaluationsQueryVariables>(
    GET_EVALUATIONS_QUERY,
    {
      variables: {
        assetKey,
        cursor: selectedEvaluationId ? `${selectedEvaluationId + 1}` : undefined,
        limit: 2,
      },
      skip: !!_selectedEvaluation || !!selectedPartition,
    },
  );

  const {data: specificPartitionData, previousData: previousSpecificPartitionData} = useQuery<
    GetEvaluationsSpecificPartitionQuery,
    GetEvaluationsSpecificPartitionQueryVariables
  >(GET_EVALUATIONS_SPECIFIC_PARTITION_QUERY, {
    variables: {
      assetKey,
      evaluationId: selectedEvaluationId!,
      partition: selectedPartition!,
    },
    skip: !selectedEvaluationId || !selectedPartition,
  });

  if (!_selectedEvaluation && loading && !data) {
    return (
      <Box flex={{direction: 'column', grow: 1}}>
        <Box
          style={{flex: '0 0 48px'}}
          border="bottom"
          padding={{horizontal: 16}}
          flex={{alignItems: 'center', justifyContent: 'space-between'}}
        >
          <Subheading>Result</Subheading>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flex={{direction: 'column', grow: 1}}>
        <Box flex={{direction: 'row', justifyContent: 'center'}} padding={24}>
          <ErrorWrapper>{JSON.stringify(error)}</ErrorWrapper>
        </Box>
      </Box>
    );
  }

  if (
    data?.assetConditionEvaluationRecordsOrError?.__typename ===
    'AutoMaterializeAssetEvaluationNeedsMigrationError'
  ) {
    return (
      <Box flex={{direction: 'column', grow: 1}}>
        <Box flex={{direction: 'row', justifyContent: 'center'}} padding={{vertical: 24}}>
          <NonIdealState
            icon="error"
            title="Error"
            description={data.assetConditionEvaluationRecordsOrError.message}
          />
        </Box>
      </Box>
    );
  }

  const evaluations = data?.assetConditionEvaluationRecordsOrError?.records || [];
  const selectedEvaluation =
    _selectedEvaluation ??
    evaluations.find((evaluation) => evaluation.evaluationId === selectedEvaluationId);

  if (!selectedEvaluationId && !evaluations.length) {
    return (
      <Box flex={{direction: 'column', grow: 1}}>
        <Box flex={{direction: 'row', justifyContent: 'center'}} padding={{vertical: 24}}>
          <NonIdealState
            icon="sensors"
            title="No evaluations"
            description={
              <Body2>
                <Box flex={{direction: 'column', gap: 6}}>
                  This asset’s automation policy has not been evaluated yet. Make sure your
                  automation sensor is running.
                </Box>
                <AnchorButton to="/asset-groups">Manage sensor</AnchorButton>
                <a href="">Learn more about automation policies</a>
              </Body2>
            }
          />
        </Box>
      </Box>
    );
  }

  return (
    <AutomaterializeMiddlePanelWithData
      selectedEvaluation={selectedEvaluation}
      specificPartitionData={specificPartitionData || previousSpecificPartitionData}
      definition={definition}
      selectPartition={setSelectPartition}
      selectedPartition={selectedPartition}
    />
  );
};

export const AutomaterializeMiddlePanelWithData = ({
  selectedEvaluation,
  definition,
  selectPartition,
  specificPartitionData,
  selectedPartition,
}: {
  definition?: AssetViewDefinitionNodeFragment | null;
  selectedEvaluation?: AssetConditionEvaluationRecordFragment;
  selectPartition: (partitionKey: string | null) => void;
  specificPartitionData?: GetEvaluationsSpecificPartitionQuery;
  selectedPartition: string | null;
}) => {
  const statusTag = React.useMemo(() => {
    if (selectedEvaluation?.numRequested) {
      if (definition?.partitionDefinition) {
        return (
          <Tag intent="success">
            <Box flex={{direction: 'row', gap: 4, alignItems: 'center'}}>
              <StatusDot $color={colorAccentGreen()} />
              {selectedEvaluation.numRequested} Requested
            </Box>
          </Tag>
        );
      }
      return (
        <Tag intent="success">
          <Box flex={{direction: 'row', gap: 4, alignItems: 'center'}}>
            <StatusDot $color={colorAccentGreen()} />
            Requested
          </Box>
        </Tag>
      );
    }
    return (
      <Tag>
        <Box flex={{direction: 'row', gap: 4, alignItems: 'center'}}>
          <StatusDot $color={colorAccentGray()} />
          Not Requested
        </Box>
      </Tag>
    );
  }, [definition, selectedEvaluation]);

  const evaluation = selectedEvaluation?.evaluation;
  const partitionsEvaluated = React.useMemo(() => {
    if (evaluation) {
      const rootEvaluationNode = evaluation.evaluationNodes.find(
        (node) => node.uniqueId === evaluation.rootUniqueId,
      );
      if (rootEvaluationNode?.__typename === 'PartitionedAssetConditionEvaluationNode') {
        return (
          rootEvaluationNode.numTrue + rootEvaluationNode.numFalse + rootEvaluationNode.numSkipped
        );
      }
    }
    return 0;
  }, [evaluation]);

  const {data} = useQuery<FullPartitionsQuery, FullPartitionsQueryVariables>(
    FULL_PARTITIONS_QUERY,
    {
      variables: definition
        ? {
            assetKey: {path: definition.assetKey.path},
          }
        : undefined,
      skip: !definition?.assetKey,
    },
  );

  let partitionKeys: DimensionPartitionKeys[] = emptyArray;
  if (data?.assetNodeOrError.__typename === 'AssetNode') {
    partitionKeys = data.assetNodeOrError.partitionKeysByDimension;
  }

  const allPartitions = React.useMemo(() => {
    if (partitionKeys.length === 1) {
      return partitionKeys[0]!.partitionKeys;
    } else if (partitionKeys.length === 2) {
      const firstSet = partitionKeys[0]!.partitionKeys;
      const secondSet = partitionKeys[1]!.partitionKeys;
      return firstSet.flatMap((key1) => secondSet.map((key2) => `${key1}|${key2}`));
    } else if (partitionKeys.length > 2) {
      throw new Error('Only 2 dimensions are supported');
    }
    return [];
  }, [partitionKeys]);

  return (
    <Box flex={{direction: 'column', grow: 1}}>
      <Box
        style={{flex: '0 0 48px'}}
        padding={{horizontal: 16}}
        border="bottom"
        flex={{alignItems: 'center', justifyContent: 'space-between'}}
      >
        <Subheading>Result</Subheading>
      </Box>
      {selectedEvaluation ? (
        <Box padding={{horizontal: 24, vertical: 12}}>
          <Box border="bottom" padding={{vertical: 12}} margin={{bottom: 12}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24}}>
              <Box flex={{direction: 'column', gap: 5}}>
                <Subtitle2>Evaluation Result</Subtitle2>
                <div>{statusTag}</div>
              </Box>
              {selectedEvaluation?.timestamp ? (
                <Box flex={{direction: 'column', gap: 5}}>
                  <Subtitle2>Timestamp</Subtitle2>
                  <Timestamp timestamp={{unix: selectedEvaluation?.timestamp}} />
                </Box>
              ) : null}
              <Box flex={{direction: 'column', gap: 5}}>
                <Subtitle2>Duration</Subtitle2>
                <div>
                  {selectedEvaluation?.startTimestamp && selectedEvaluation?.endTimestamp
                    ? formatElapsedTimeWithMsec(
                        (selectedEvaluation.endTimestamp - selectedEvaluation.startTimestamp) *
                          1000,
                      )
                    : '\u2013'}
                </div>
              </Box>
            </div>
          </Box>
          <Box
            border="bottom"
            padding={{vertical: 12}}
            margin={{top: 12, bottom: partitionsEvaluated ? undefined : 12}}
          >
            <Subtitle2>Policy evaluation</Subtitle2>
          </Box>
          {partitionsEvaluated ? (
            <Box padding={{vertical: 12}} flex={{justifyContent: 'space-between'}}>
              {numberFormatter.format(partitionsEvaluated)} partitions evaluated
              <TagSelectorWrapper>
                <TagSelectorWithSearch
                  closeOnSelect
                  placeholder="Select a partition to view its result"
                  allTags={allPartitions}
                  selectedTags={selectedPartition ? [selectedPartition] : []}
                  setSelectedTags={(tags) => {
                    selectPartition(tags[tags.length - 1] || null);
                  }}
                  renderDropdownItem={(tag, props) => (
                    <MenuItem text={tag} onClick={props.toggle} />
                  )}
                  renderDropdown={(dropdown) => (
                    <Box padding={{top: 8, horizontal: 4}} style={{width: '370px'}}>
                      {dropdown}
                    </Box>
                  )}
                  renderTag={(tag, tagProps) => (
                    <BaseTag
                      key={tag}
                      textColor={colorTextLight()}
                      fillColor={colorBackgroundGray()}
                      icon={<Icon name="partition" color={colorAccentGray()} />}
                      label={
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 4,
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            maxWidth: '120px',
                          }}
                          data-tooltip={tag}
                          data-tooltip-style={TagSelectorDefaultTagTooltipStyle}
                        >
                          <MiddleTruncate text={tag} />
                          <Box style={{cursor: 'pointer'}} onClick={tagProps.remove}>
                            <Icon name="close" />
                          </Box>
                        </div>
                      }
                    />
                  )}
                  usePortal={false}
                />
                <SearchIconWrapper>
                  <Icon name="search" />
                </SearchIconWrapper>
              </TagSelectorWrapper>
            </Box>
          ) : null}
          <PolicyEvaluationTable
            evaluationRecord={
              selectedPartition && specificPartitionData?.assetConditionEvaluationForPartition
                ? {evaluation: specificPartitionData.assetConditionEvaluationForPartition}
                : selectedEvaluation
            }
            definition={definition}
            selectPartition={selectPartition}
          />
          <Box border="bottom" padding={{vertical: 12}} margin={{vertical: 12}}>
            <Subtitle2>Runs launched ({selectedEvaluation.runIds.length})</Subtitle2>
          </Box>
          <AutomaterializeRunsTable runIds={selectedEvaluation.runIds} />
        </Box>
      ) : null}
    </Box>
  );
};

const FULL_PARTITIONS_QUERY = gql`
  query FullPartitionsQuery($assetKey: AssetKeyInput!) {
    assetNodeOrError(assetKey: $assetKey) {
      ... on AssetNode {
        id
        partitionKeysByDimension {
          name
          type
          partitionKeys
        }
      }
    }
  }
`;
const TagSelectorWrapper = styled.div`
  position: relative;

  ${TagSelectorContainer} {
    width: 370px;
    padding-left: 32px;
    height: 36px;
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 12px;
  top: 0px;
  bottom: 0px;
  pointer-events: none;
  display: flex;
  align-items: center;
`;
