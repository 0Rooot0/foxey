import StudentAvatar from "./StudentAvatar";

export default function WorkspacePreview() {
  return (
    <div className="workspace-preview" aria-label="Illustrative Foxey EDU workspace with example students">
      <div className="demo-topbar">
        <span className="demo-menu">☰</span>
        <strong>Python classroom <span>⌄</span></strong>
        <div className="demo-avatars">
          <StudentAvatar variant={0} color="#ae65ff" name="Example student Ava" size={29} />
          <StudentAvatar variant={1} color="#2caaff" name="Example student Liam" size={29} />
          <StudentAvatar variant={2} color="#1dc797" name="Example student Noah" size={29} />
        </div>
        <span className="demo-share">♧ &nbsp; Share</span><span className="demo-run">▶ &nbsp; Run</span><span className="demo-gear">⚙</span>
      </div>
      <div className="demo-body">
        <div className="demo-sidebar">
          <span className="demo-active">⌂ &nbsp; Classroom</span>
          <span>▤ &nbsp; Assignments</span><span>▧ &nbsp; Rooms</span><span>♧ &nbsp; Students</span><span>▥ &nbsp; Progress</span>
          <small>ROOMS <b>+</b></small>
          <span className="demo-active"><i className="room-blue" />Main Room</span>
          <span><i className="room-orange" />Group 1</span>
          <span><i className="room-green" />Group 2</span>
          <span><i className="room-purple" />Project Help</span>
        </div>
        <div className="demo-main">
          <div className="demo-tabs"><span>🐍 &nbsp; main.py</span><span>main.js</span><b>+</b></div>
          <div className="demo-code">
            <div><i>1</i><span className="demo-comment"># Welcome to Foxey EDU!</span></div>
            <div><i>2</i></div>
            <div><i>3</i><span className="demo-purple">def</span>&nbsp; <span className="demo-cyan">greet</span>(name):</div>
            <div><i>4</i>&nbsp;&nbsp;&nbsp;&nbsp;<span className="demo-purple">return</span>&nbsp; <span className="demo-yellow">f&quot;Hello, &#123;name&#125;! 👋&quot;</span></div>
            <div><i>5</i></div>
            <div><i>6</i><span className="demo-cyan">print</span>(greet(<span className="demo-yellow">&quot;Class&quot;</span>))</div>
            <span className="demo-cursor ava">Ava</span><span className="demo-cursor liam">Liam</span><span className="demo-cursor noah">Noah</span>
          </div>
          <div className="demo-output-tabs"><span>Output</span><span>Classroom Chat</span></div>
          <div className="demo-output">Hello, Class! 👋<br /><span>›</span></div>
        </div>
      </div>
    </div>
  );
}
