import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { it,expect } from 'vitest';
import { FacebookPageTable } from './facebook-settings';
import { ChannelBadge } from './channel-badge';
it('Facebook catalog escapes provider labels and exposes no token/action implying messaging readiness',()=>{const html=renderToStaticMarkup(<FacebookPageTable pages={[{id:'synthetic',channel_id:'channel',page_id:'123',name:'<script>provider</script>',team_id:'team',credential_status:'stored',connected_at:'2026-10-06T00:00:00Z'}]}/>);expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).toContain('Page ID: 123');expect(html).toContain('Chưa bật nhận/gửi tin');expect(html).not.toContain('access_token');});
it('Messenger and demo channels remain visibly distinguishable',()=>{expect(renderToStaticMarkup(<ChannelBadge channel="messenger"/>)).not.toContain('Demo');expect(renderToStaticMarkup(<ChannelBadge channel="mock_messenger"/>)).toContain('Demo');});
