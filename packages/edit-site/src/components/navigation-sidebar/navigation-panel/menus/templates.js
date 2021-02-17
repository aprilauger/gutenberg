/**
 * External dependencies
 */
import { map, find, some } from 'lodash';

/**
 * WordPress dependencies
 */
import {
	__experimentalNavigationItem as NavigationItem,
	__experimentalNavigationMenu as NavigationMenu,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { useState, useCallback, useMemo } from '@wordpress/element';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Internal dependencies
 */
import {
	MENU_ROOT,
	MENU_TEMPLATES,
	MENU_TEMPLATES_GENERAL,
	MENU_TEMPLATES_PAGES,
	MENU_TEMPLATES_POSTS,
	MENU_TEMPLATES_UNUSED,
	TEMPLATES_TOP_LEVEL,
} from '../constants';
import NewTemplateDropdown from '../new-template-dropdown';
import TemplateNavigationItem from '../template-navigation-item';
import SearchResults from '../search-results';
import TemplatesSubMenu from './templates-sub';
import { isTemplateSuperseded } from '../template-hierarchy';

function getTemplateLocation( template ) {
	const { slug } = template;

	if ( TEMPLATES_TOP_LEVEL.includes( slug ) ) {
		return MENU_TEMPLATES;
	}

	if (
		slug.startsWith( 'post-' ) ||
		slug.startsWith( 'author-' ) ||
		slug.startsWith( 'single-post-' ) ||
		slug.startsWith( 'tag' )
	) {
		return MENU_TEMPLATES_POSTS;
	}

	if ( slug.startsWith( 'page-' ) ) {
		return MENU_TEMPLATES_PAGES;
	}

	return MENU_TEMPLATES_GENERAL;
}

function getUnusedTemplates( templates, showOnFront ) {
	const unusedTemplates = [];

	// `home` template is unused if it is superseded by `front-page`
	// or show on front is set to show a page rather than blog posts.
	const homeTemplateExists = some( templates, { slug: 'home' } );
	if ( homeTemplateExists && showOnFront !== 'posts' ) {
		unusedTemplates.push( find( templates, { slug: 'home' } ) );
	}

	const usedTemplates = templates.filter(
		( template ) => ! unusedTemplates.includes( template )
	);
	const usedTemplateSlugs = map( usedTemplates, 'slug' );
	const supersededTemplates = templates.filter( ( { slug } ) =>
		isTemplateSuperseded( slug, usedTemplateSlugs )
	);

	return [ ...supersededTemplates, ...unusedTemplates ];
}

function getTemplatesLocationMap( templates ) {
	return templates.reduce( ( obj, template ) => {
		obj[ template.slug ] = getTemplateLocation( template );
		return obj;
	}, {} );
}

export default function TemplatesMenu() {
	const [ search, setSearch ] = useState( '' );
	const onSearch = useCallback( ( value ) => {
		setSearch( value );
	} );

	const { templates, showOnFront } = useSelect( ( select ) => {
		const { getEntityRecords, getEditedEntityRecord } = select( coreStore );
		return {
			templates: getEntityRecords( 'postType', 'wp_template', {
				per_page: -1,
			} ),
			showOnFront: getEditedEntityRecord( 'root', 'site' ).show_on_front,
		};
	}, [] );

	const templatesWithLocation = useMemo( () => {
		if ( ! templates ) {
			return null;
		}

		const unusedTemplates = getUnusedTemplates( templates, showOnFront );
		const templateLocations = getTemplatesLocationMap( templates );

		return templates.map( ( template ) => ( {
			template,
			location: find( unusedTemplates, { slug: template.slug } )
				? MENU_TEMPLATES_UNUSED
				: templateLocations[ template.slug ],
		} ) );
	}, [ templates ] );

	const topLevelTemplates = useMemo(
		() =>
			templatesWithLocation
				?.filter( ( { location } ) => location === MENU_TEMPLATES )
				?.map( ( { template } ) => template ) ?? [],
		[ templatesWithLocation ]
	);

	return (
		<NavigationMenu
			menu={ MENU_TEMPLATES }
			title={ __( 'Templates' ) }
			titleAction={ <NewTemplateDropdown /> }
			parentMenu={ MENU_ROOT }
			hasSearch={ true }
			onSearch={ onSearch }
			search={ search }
		>
			{ search && (
				<SearchResults items={ templates } search={ search } />
			) }

			{ ! search && (
				<>
					{ map( topLevelTemplates, ( template ) => (
						<TemplateNavigationItem
							item={ template }
							key={ `wp_template-${ template.id }` }
						/>
					) ) }
					<NavigationItem
						navigateToMenu={ MENU_TEMPLATES_POSTS }
						title={ __( 'Post templates' ) }
						hideIfTargetMenuEmpty
					/>
					<NavigationItem
						navigateToMenu={ MENU_TEMPLATES_PAGES }
						title={ __( 'Page templates' ) }
						hideIfTargetMenuEmpty
					/>
					<NavigationItem
						navigateToMenu={ MENU_TEMPLATES_GENERAL }
						title={ __( 'General templates' ) }
						hideIfTargetMenuEmpty
					/>
					<NavigationItem
						navigateToMenu={ MENU_TEMPLATES_UNUSED }
						title={ __( 'Unused templates' ) }
						hideIfTargetMenuEmpty
					/>
				</>
			) }

			{ ! search && templates === null && (
				<NavigationItem title={ __( 'Loading…' ) } isText />
			) }

			<TemplatesSubMenu
				menu={ MENU_TEMPLATES_POSTS }
				title={ __( 'Post templates' ) }
				templates={ templatesWithLocation }
			/>
			<TemplatesSubMenu
				menu={ MENU_TEMPLATES_PAGES }
				title={ __( 'Page templates' ) }
				templates={ templatesWithLocation }
			/>
			<TemplatesSubMenu
				menu={ MENU_TEMPLATES_GENERAL }
				title={ __( 'General templates' ) }
				templates={ templatesWithLocation }
			/>
			<TemplatesSubMenu
				menu={ MENU_TEMPLATES_UNUSED }
				title={ __( 'Unused templates' ) }
				templates={ templatesWithLocation }
			/>
		</NavigationMenu>
	);
}
