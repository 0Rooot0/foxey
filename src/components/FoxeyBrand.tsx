import Image from "next/image";

export default function FoxeyBrand({ edu = false }: { edu?: boolean }) {
  return <span className="foxey-brand"><span className="foxey-brand-icon"><Image src="/foxey-logo.png" alt="" width={1536} height={1024} sizes="140px" /></span><span>Fox<span className="foxey-brand-accent">ey</span></span>{edu && <small>EDU</small>}</span>;
}
