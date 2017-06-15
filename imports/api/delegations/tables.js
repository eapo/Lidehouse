import { TAPi18n } from 'meteor/tap:i18n';

const __ = TAPi18n.__;

function renderDeleteButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-delete nav-item icon-trash"></span>`;
  return html;
}

function renderEditButton(cellData, renderType, currentRow) {
  const html = `<span data-id=${cellData} class="js-edit nav-item icon-edit"></span>`;
  return html;
}

export function delegationColumns() {
  return [
    { data: 'objectId', title: __('delegations.objectId.label') },
    { data: 'targetUserId', title: __('delegations.targetUserId.label') },
    { data: '_id', render: renderEditButton },
    { data: '_id', render: renderDeleteButton },
  ];
}
