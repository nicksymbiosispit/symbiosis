// Built only by test:security:browser; never included in the production entry.
import {createRoot} from 'react-dom/client';
import ChatRoom from '../../src/components/ChatRoom.jsx';
import ProfilePage from '../../src/components/ProfilePage.jsx';
import RoomsPage from '../../src/components/RoomsPage.jsx';
import ModeratorPanel from '../../src/components/ModeratorPanel.jsx';
import '../../src/styles.css';
import '../../src/aero.css';
const attack='<img src=x onerror="window.parent.__xss=1">';
const me={id:'00000000-0000-0000-0000-000000000001',username:'tester',tags:[],created_at:new Date().toISOString()};
const other={...me,id:'00000000-0000-0000-0000-000000000002',username:attack,bio:attack,
  accent_color:'#39ff14',background_color:'#080b10',frame_style:'neon',
  profile_html:`<p id="custom">Custom HTML works</p><style>p{color:rgb(10,90,10)}</style><script>parent.__xss=1</script><img src=x onerror="parent.__xss=2"><form action="https://blocked.invalid" target="_top"><input name="secret" value="test"><button>Submit attack</button></form>`};
const room={slug:'lobby',name:'Lobby',category:'general',description:attack,owner_id:me.id,minimum_role:'everyone',media_mode:'allowed',slow_mode_seconds:0};
const noop=()=>{};
const view=new URLSearchParams(location.search).get('view');
const friends={friends:[],relationshipFor:()=>null};
let content;
if(view==='profile') content=<ProfilePage currentUser={me} profile={me} viewedProfile={other} friendsApi={friends} safety={{isBlocked:()=>false}} isOnline={()=>false}/>;
else if(view==='rooms') content=<RoomsPage rooms={[room]} currentUserId={me.id} isStaff onOpen={noop} onFavorite={noop}/>;
else if(view==='moderation') content=<ModeratorPanel reports={[]} deletionLogs={[]} actions={[]} events={[]} people={[me,other]} rooms={[room]} chatFramesEnabled canManageTags onChatFrames={noop}/>;
else content=<ChatRoom room="lobby" userId={me.id} currentUsername="tester" mentionUsers={[me,other]} availableRooms={[room]} chatFramesEnabled messages={[
 {id:1,user_id:other.id,profile:other,body:attack,created_at:me.created_at},
 {id:2,user_id:other.id,profile:other,body:'https://tenor.com/view/test-123',created_at:me.created_at}
]} status="" onSend={async()=>true} onViewProfile={noop} onReport={noop}/>;
createRoot(document.getElementById('root')).render(<main className="page-shell">{content}</main>);
