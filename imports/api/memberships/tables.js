import { TAPi18n } from 'meteor/tap:i18n';

const __ = TAPi18n.__;

function translate(cellData, renderType, currentRow) {
  return __(cellData);
}

function renderDeleteButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-delete nav-item icon-trash"></span>`;
  return html;
}

function renderEditButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-edit nav-item icon-edit"></span>`;
  return html;
}

export function ownershipColumns() {
  return [
    { data: 'ownership.serial', title: __('memberships.ownership.serial.label') },
    { data: 'location()', title: __('memberships.ownership.location.label') },
    { data: 'ownership.type', title: __('memberships.ownership.type.label'), render: translate },
    { data: 'ownership.lot', title: __('memberships.ownership.lot.label') },
    { data: 'ownership.size', title: __('memberships.ownership.size.label') },
    { data: 'ownership.share', title: __('memberships.ownership.share.label') },
    { data: 'userName()', title: __('owner') },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}

export function roleshipColumns() {
  return [
    { data: 'userName()', title: __('user') },
    { data: 'role', title: __('role'), render: translate },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}