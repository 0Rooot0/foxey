import Image from "next/image";

export default function FoxeyBrand({ edu = false }: { edu?: boolean }) {
  return <span className="foxey-brand"><span className="foxey-brand-icon"><Image src="/foxey-happy-logo.png" alt="" width={1280} height={1280} sizes="43px" /></span><span>Fox<span className="foxey-brand-accent">ey</span></span>{edu && <small>EDU</small>}</span>;
}
