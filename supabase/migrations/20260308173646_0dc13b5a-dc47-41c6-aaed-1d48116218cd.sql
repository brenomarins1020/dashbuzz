
-- Clean up duplicate: keep the first one created
DELETE FROM memberships WHERE workspace_id = '7fa236e7-2512-4969-9e4e-e81035d6e6ff';
DELETE FROM workspaces WHERE id = '7fa236e7-2512-4969-9e4e-e81035d6e6ff';
