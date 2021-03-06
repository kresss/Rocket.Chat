

import { useDebouncedValue, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { useMemo, useCallback, useState } from 'react';
import { Table, Icon } from '@rocket.chat/fuselage';

import { Th } from '../../../../client/components/GenericTable';
import { useTranslation } from '../../../../client/contexts/TranslationContext';
import { useEndpointDataExperimental } from '../../../../client/hooks/useEndpointDataExperimental';
import { useMethod } from '../../../../client/contexts/ServerContext';
import { usePermission } from '../../../../client/contexts/AuthorizationContext';
import NotAuthorizedPage from '../../../../client/components/NotAuthorizedPage';
import { useRouteParameter, useRoute } from '../../../../client/contexts/RouterContext';
import VerticalBar from '../../../../client/components/basic/VerticalBar';
import TagsPage from './TagsPage';
import { TagEditWithData, TagNew } from './EditTag';

export function RemoveTagButton({ _id, reload }) {
	const removeTag = useMethod('livechat:removeTag');
	const tagsRoute = useRoute('omnichannel-tags');


	const handleRemoveClick = useMutableCallback(async (e) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			await removeTag(_id);
		} catch (error) {
			console.log(error);
		}
		tagsRoute.push({});
		reload();
	});

	return <Table.Cell fontScale='p1' color='hint' onClick={handleRemoveClick} withTruncatedText><Icon name='trash' size='x20'/></Table.Cell>;
}

const sortDir = (sortDir) => (sortDir === 'asc' ? 1 : -1);

const useQuery = ({ text, itemsPerPage, current }, [column, direction]) => useMemo(() => ({
	fields: JSON.stringify({ name: 1 }),
	text,
	sort: JSON.stringify({ [column]: sortDir(direction), usernames: column === 'name' ? sortDir(direction) : undefined }),
	...itemsPerPage && { count: itemsPerPage },
	...current && { offset: current },
}), [text, itemsPerPage, current, column, direction]);

function TagsRoute() {
	const t = useTranslation();
	const canViewTags = usePermission('manage-livechat-tags');

	const [params, setParams] = useState({ text: '', current: 0, itemsPerPage: 25 });
	const [sort, setSort] = useState(['name', 'asc']);

	const debouncedParams = useDebouncedValue(params, 500);
	const debouncedSort = useDebouncedValue(sort, 500);
	const query = useQuery(debouncedParams, debouncedSort);
	const tagsRoute = useRoute('omnichannel-tags');
	const context = useRouteParameter('context');
	const id = useRouteParameter('id');

	const onHeaderClick = useMutableCallback((id) => {
		const [sortBy, sortDirection] = sort;

		if (sortBy === id) {
			setSort([id, sortDirection === 'asc' ? 'desc' : 'asc']);
			return;
		}
		setSort([id, 'asc']);
	});

	const onRowClick = useMutableCallback((id) => () => tagsRoute.push({
		context: 'edit',
		id,
	}));

	const { data, reload } = useEndpointDataExperimental('livechat/tags.list', query) || {};

	const header = useMemo(() => [
		<Th key={'name'} direction={sort[1]} active={sort[0] === 'name'} onClick={onHeaderClick} sort='name' w='x120'>{t('Name')}</Th>,
		<Th key={'description'} direction={sort[1]} active={sort[0] === 'description'} onClick={onHeaderClick} sort='description' w='x200'>{t('Description')}</Th>,
		<Th key={'remove'} w='x40'>{t('Remove')}</Th>,
	].filter(Boolean), [sort, onHeaderClick, t]);

	const renderRow = useCallback(({ _id, name, description }) => <Table.Row key={_id} tabIndex={0} role='link' onClick={onRowClick(_id)} action qa-user-id={_id}>
		<Table.Cell withTruncatedText>{name}</Table.Cell>
		<Table.Cell withTruncatedText>{description}</Table.Cell>
		<RemoveTagButton _id={_id} reload={reload}/>
	</Table.Row>, [reload, onRowClick]);


	const EditTagsTab = useCallback(() => {
		if (!context) {
			return '';
		}
		const handleVerticalBarCloseButtonClick = () => {
			tagsRoute.push({});
		};

		return <VerticalBar className={'contextual-bar'}>
			<VerticalBar.Header>
				{context === 'edit' && t('Edit_Tag')}
				{context === 'new' && t('New_Tag')}
				<VerticalBar.Close onClick={handleVerticalBarCloseButtonClick} />
			</VerticalBar.Header>

			{context === 'edit' && <TagEditWithData tagId={id} reload={reload}/>}
			{context === 'new' && <TagNew reload={reload} />}

		</VerticalBar>;
	}, [t, context, id, tagsRoute, reload]);

	if (!canViewTags) {
		return <NotAuthorizedPage />;
	}


	return <TagsPage
		setParams={setParams}
		params={params}
		onHeaderClick={onHeaderClick}
		data={data} useQuery={useQuery}
		reload={reload}
		header={header}
		renderRow={renderRow}
		title={'Tags'}>
		<EditTagsTab />
	</TagsPage>;
}

export default TagsRoute;
